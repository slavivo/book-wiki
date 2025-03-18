document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const book = document.getElementById('magic-book');
    const toggleButton = document.getElementById('toggle-book');
    const pageContent = document.getElementById('page-content');
    const currentPageTitle = document.getElementById('current-page-title');
    const backButton = document.getElementById('back-button');
    const chapterSelector = document.getElementById('chapter-selector');
    
    // Initially hide the back button
    backButton.style.display = 'none';
    
    // State variables
    let isOpen = false;
    let currentPageId = null;
    let pageHistory = []; // Array to store visited page IDs
    let currentChapter = 800; // Default to chapter 1
    let wikiMetadata = null;
    let entryCache = {}; // Cache for loaded entries
    
    // Initialize the book
    function initBook() {
        // Set initial state of book
        book.classList.add('closed');
        document.querySelector('.book-pages').style.pointerEvents = 'none';
        
        // Check for current chapter in localStorage (for returning users)
        const savedChapter = localStorage.getItem('currentChapter');
        if (savedChapter) {
            currentChapter = parseInt(savedChapter, 10);
        }
        
        // Setup chapter selector if it exists
        if (chapterSelector) {
            setupChapterSelector();
        }
        
        // Load metadata and initialize pages
        fetchMetadata()
            .then(metadata => {
                // Store metadata globally
                wikiMetadata = metadata;
                
                // Find first available page
                return findFirstAvailablePage();
            })
            .then(firstPageId => {
                // Set initial page
                currentPageId = firstPageId;
                
                // Add first page to history and display it
                pageHistory.push(currentPageId);
                return updatePage();
            })
            .then(() => {
                // Set up page links
                setupPageLinks();
            
                // Set up back button
                setupBackButton();
            })
            .catch(error => {
                console.error('Error initializing book:', error);
            });
    }
    
    // Fetch metadata from JSON file
    async function fetchMetadata() {
        try {
            const response = await fetch('./content/metadata.json');
            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error('Failed to load metadata from JSON');
        }
    }
    
    // Fetch an individual entry file
    async function fetchEntry(entryId) {
        // Check cache first
        if (entryCache[entryId]) {
            return entryCache[entryId];
        }
        
        try {
            const response = await fetch(`./content/entries/${entryId}.json`);
            const data = await response.json();
            
            // Cache the entry
            entryCache[entryId] = data;
            return data;
        } catch (error) {
            throw new Error(`Failed to load entry: ${entryId}`);
        }
    }
    
    // Find the first available page for current chapter
    async function findFirstAvailablePage() {
        // Default to introduction if available
        const introEntry = wikiMetadata.entries.find(entry => entry.id === 'introduction');
        if (introEntry && introEntry.published !== false) {
            if (await isPageAvailable('introduction')) {
                return 'introduction';
            }
        }
        
        // Otherwise find first available page
        for (const entry of wikiMetadata.entries) {
            if (entry.published === false) continue;
            
            if (await isPageAvailable(entry.id)) {
                return entry.id;
            }
        }
        
        return null; // No pages available
    }
    
    // Check if a page is available for current chapter
    async function isPageAvailable(pageId) {
        // Check if page exists in metadata
        const metadataEntry = wikiMetadata.entries.find(entry => entry.id === pageId);
        if (!metadataEntry || metadataEntry.published === false) {
            return false;
        }
        
        // Load the entry data
        try {
            const entry = await fetchEntry(pageId);
            
            // Check if any version of this page is available at current chapter
            return entry.versions.some(version => 
                version.chapterRange[0] <= currentChapter && 
                version.chapterRange[1] >= currentChapter
            );
        } catch (error) {
            console.error(error);
            return false;
        }
    }
    
    // Get the appropriate version of a page for current chapter
    async function getPageVersionForChapter(pageId) {
        try {
            // Load the entry data
            const entry = await fetchEntry(pageId);
            
            // Find the appropriate version for the current chapter
            return entry.versions.find(version => 
                version.chapterRange[0] <= currentChapter && 
                version.chapterRange[1] >= currentChapter
            );
        } catch (error) {
            console.error(error);
            return null;
        }
    }
    
    // Setup chapter selector if present
    function setupChapterSelector() {
        // Determine max chapter count (you can adjust this as needed)
        const maxChapters = 10; // Example: 10 chapters in your book
        
        // Clear existing options
        chapterSelector.innerHTML = '';
        
        // Add options for each chapter
        for (let i = 1; i <= maxChapters; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Chapter ${i}`;
            chapterSelector.appendChild(option);
        }
        
        // Set the current chapter
        chapterSelector.value = currentChapter;
        
        // Add change event listener
        chapterSelector.addEventListener('change', function() {
            currentChapter = parseInt(this.value, 10);
            localStorage.setItem('currentChapter', currentChapter);
            
            // Check if current page is still available
            isPageAvailable(currentPageId).then(available => {
                if (available) {
                    // Update current page to show appropriate version
                    updatePage();
                } else {
                    // Current page no longer available, find a new one
                    findFirstAvailablePage().then(pageId => {
                        if (pageId) {
                            // Reset history and show new page
                            currentPageId = pageId;
                            pageHistory = [currentPageId];
                            updatePage();
                        } else {
                            // No available pages
                            pageContent.innerHTML = '<p>No content available for your current chapter.</p>';
                        }
                    });
                }
            });
        });
    }
    
    // Toggle open/close book
    toggleButton.addEventListener('click', function() {
        console.log('Toggling book');
        isOpen = !isOpen;
        
        // Toggle a class instead of directly setting transform
        if (isOpen) {
            book.classList.add('open');
            book.classList.remove('closed');
        } else {
            book.classList.add('closed');
            book.classList.remove('open');
        }
        
        // Give the animation time to complete before enabling/disabling elements
        setTimeout(() => {
            if (isOpen) {
                // Make book cover not clickable when open
                document.querySelector('.book-cover').style.pointerEvents = 'none';
                // Make book pages clickable
                document.querySelector('.book-pages').style.pointerEvents = 'auto';
                // Show back button if we have history
                updateBackButtonVisibility();
            } else {
                // Make book cover clickable when closed
                document.querySelector('.book-cover').style.pointerEvents = 'auto';
                // Make book pages not clickable
                document.querySelector('.book-pages').style.pointerEvents = 'none';
                // Hide back button when book is closed
                backButton.style.display = 'none';
            }
        }, 100); // Small delay to let animation start
    });
    
    // Update page content based on current pageId
    async function updatePage() {
        try {
            // Show loading indicator
            pageContent.innerHTML = '<p>Loading...</p>';
            
            // Get the appropriate version for current chapter
            const pageVersion = await getPageVersionForChapter(currentPageId);
            
            if (!pageVersion) {
                pageContent.innerHTML = '<p>Page not available for your current chapter.</p>';
                return;
            }
            
            // Update the page content
            currentPageTitle.textContent = pageVersion.title;
            pageContent.innerHTML = pageVersion.content;
            
            // Update back button visibility
            updateBackButtonVisibility();
            
            // Setup page links for the new content
            setupPageLinksInContent();
        } catch (error) {
            console.error('Error updating page:', error);
            pageContent.innerHTML = '<p>Error loading page content.</p>';
        }
    }
    
    // Update back button visibility based on history
    function updateBackButtonVisibility() {
        if (isOpen && pageHistory.length > 1) {
            backButton.style.display = 'block';
        } else {
            backButton.style.display = 'none';
        }
    }
    
    // Set up back button functionality
    function setupBackButton() {
        backButton.addEventListener('click', function() {
            if (pageHistory.length > 1) {
                // Remove current page from history
                pageHistory.pop();
                // Set current page to previous page in history
                currentPageId = pageHistory[pageHistory.length - 1];
                updatePage();
            }
        });
    }
    
    // Set up page links in the current content
    function setupPageLinksInContent() {
        const pageLinks = document.querySelectorAll('.page-link');
        pageLinks.forEach(link => {
            // Convert from data-index to data-page-id if needed
            if (link.hasAttribute('data-index') && !link.hasAttribute('data-page-id')) {
                // For backward compatibility with old links format
                const indexValue = link.getAttribute('data-index');
                if (wikiMetadata.entries[indexValue]) {
                    link.setAttribute('data-page-id', wikiMetadata.entries[indexValue].id);
                }
            }
        });
    }
    
    // Set up global page link click handlers
    function setupPageLinks() {
        console.log('Setting up page links');
        // Using event delegation for page links
        document.addEventListener('click', function(e) {
            // Check if the clicked element is a page link
            if (e.target.classList.contains('page-link')) {
                console.log('Page link clicked:', e.target);
                e.preventDefault();
                
                // Get target page ID (prefer data-page-id, fall back to data-index for compatibility)
                let targetPageId;
                
                if (e.target.hasAttribute('data-page-id')) {
                    targetPageId = e.target.getAttribute('data-page-id');
                } else if (e.target.hasAttribute('data-index')) {
                    // For backward compatibility
                    const targetIndex = parseInt(e.target.getAttribute('data-index'));
                    if (wikiMetadata.entries[targetIndex]) {
                        targetPageId = wikiMetadata.entries[targetIndex].id;
                    }
                }
                
                if (targetPageId) {
                    // Check if the page is available for current chapter
                    isPageAvailable(targetPageId).then(available => {
                        if (available) {
                            // Store the new page in history
                            currentPageId = targetPageId;
                            pageHistory.push(currentPageId);
                            updatePage();
                        } else {
                            console.log(`Page ${targetPageId} not available for chapter ${currentChapter}`);
                        }
                    });
                }
            }
        });
    }
    
    // Initialize the book
    initBook();
});