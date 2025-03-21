document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const book = document.getElementById('magic-book');
    const toggleButton = document.getElementById('toggle-book');
    const pageContent = document.getElementById('page-content');
    const pageTitle = document.getElementById('page-title');
    const backButton = document.getElementById('back-button');
    
    // Initially hide the back button
    backButton.style.display = 'none';
    
    // State variables
    let isOpen = false;
    let currentPageTitle = null;
    let pageHistory = []; // Array to store visited page titles
    let currentChapter = 800; // Default to chapter 1
    let wikiMetadata = null;
    let entryCache = {}; // Cache for loaded entries
    let availableChapters = []; // Array to store available chapters
    
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

        localStorage.setItem('currentChapter', null);
        
        // Load metadata and initialize pages
        fetchMetadata()
            .then(metadata => {
                // Store metadata globally
                wikiMetadata = metadata;
                
                // Extract available chapters from metadata
                extractAvailableChapters();

                // Set up chapter selector
                setupChapterSelector();
                
                // Find first available page
                return findFirstAvailablePage();
            })
            .then(firstPageTitle => {
                // Set initial page
                currentPageTitle = firstPageTitle;
                
                // Add first page to history and display it
                pageHistory.push(currentPageTitle);
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
    
    // Extract all available chapter numbers from metadata entries
    function extractAvailableChapters() {
        // Create a Set to store unique chapter numbers
        const chaptersSet = new Set();

        // Create an array of promises to track all fetch operations
        const fetchPromises = [];

        // Process each entry to extract chapter ranges
        wikiMetadata.entries.forEach(entry => {
            if (entry.published === false) return;

            // For each entry, create a promise for fetching and push it to our array
            const fetchPromise = fetchEntry(entry.title)
                .then(entryData => {
                    entryData.versions.forEach(version => {
                        // Add start of chapter range
                        chaptersSet.add(version.chapterRange[0]);
                    });
                })
                .catch(error => {
                    console.error(`Error loading entry ${entry.title}:`, error);
                });

            fetchPromises.push(fetchPromise);
        });

        // When ALL fetch operations are complete, then update available chapters
        Promise.all(fetchPromises).then(() => {
            // Convert Set to sorted array and update available chapters
            availableChapters = Array.from(chaptersSet).sort((a, b) => a - b);

            // Update the chapter selector options after all data is loaded
            updateChapterSelectorOptions();
        });
    }

    function updateChapterSelectorOptions() {
        const selector = document.getElementById('chapter-selector');
        const savedChapter = localStorage.getItem('currentChapter');

        // Clear existing options
        while (selector.firstChild) {
            selector.removeChild(selector.firstChild);
        }

        // Add "Latest chapter" option
        const latestOption = document.createElement('option');
        latestOption.value = 'latest';
        latestOption.textContent = 'Latest chapter';
        selector.appendChild(latestOption);

        // Add options for each available chapter
        availableChapters.forEach(chapter => {
            const option = document.createElement('option');
            option.value = chapter;
            option.textContent = `Chapter ${chapter}`;
            selector.appendChild(option);
        });

        // Get the latest chapter if available
        const latestChapter = availableChapters.length > 0 ? 
            availableChapters[availableChapters.length - 1] : null;


        // Determine what to select and load
        if (savedChapter && availableChapters.includes(parseInt(savedChapter, 10))) {
            // Select the saved chapter if it exists in available chapters
            selector.value = savedChapter;
        } else {
            // Default to "Latest chapter" option
            selector.value = 'latest';

            // Load the latest chapter if available
            if (latestChapter) {
                changeChapter(latestChapter);
            }
        }
    }

    function setupChapterSelector() {
        // Get the selector element from HTML
        const selector = document.getElementById('chapter-selector');

        // Add event listener for chapter changes
        selector.addEventListener('change', function() {

            // Check if "Latest chapter" option is selected
            if (this.value === 'latest') {
                // Get the latest chapter (last in the availableChapters array)
                const latestChapter = availableChapters[availableChapters.length - 1];
                changeChapter(latestChapter);
            } else {
                const selectedChapter = parseInt(this.value, 10);
                changeChapter(selectedChapter);
            }
        });
    }

    // Handle chapter change
    function changeChapter(chapterNumber) {
        // Update current chapter
        currentChapter = chapterNumber;

        // Save to localStorage
        localStorage.setItem('currentChapter', currentChapter);

        // Reset page history
        pageHistory = [];

        // Find first available page for new chapter
        findFirstAvailablePage()
            .then(firstPageTitle => {
                // Set current page to first available page
                currentPageTitle = firstPageTitle;

                // Add to history
                pageHistory.push(currentPageTitle);

                // Update page content
                return updatePage();
            })
            .catch(error => {
                console.error('Error changing chapter:', error);
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
    async function fetchEntry(entryTitle) {
        // Check cache first
        if (entryCache[entryTitle]) {
            return entryCache[entryTitle];
        }
        
        try {
            const response = await fetch(`./content/entries/${entryTitle}.json`);
            const data = await response.json();
            // Cache the entry
            entryCache[entryTitle] = data;
            return data;
        } catch (error) {
            throw new Error(`Failed to load entry: ${entryTitle}`);
        }
    }
    
    // Find the first available page for current chapter
    async function findFirstAvailablePage() {
        // Default to introduction if available
        const introEntry = wikiMetadata.entries.find(entry => entry.title === 'introduction');
        if (introEntry && introEntry.published !== false) {
            if (await isPageAvailable('introduction')) {
                return 'introduction';
            }
        }
        
        // Otherwise find first available page
        for (const entry of wikiMetadata.entries) {
            if (entry.published === false) continue;
            
            if (await isPageAvailable(entry.title)) {
                return entry.title;
            }
        }
        
        return null; // No pages available
    }
    
    // Check if a page is available for current chapter
    async function isPageAvailable(pageTitle) {
        // Check if page exists in metadata
        const metadataEntry = wikiMetadata.entries.find(entry => entry.title === pageTitle);
        if (!metadataEntry || metadataEntry.published === false) {
            return false;
        }
        
        // Load the entry data
        try {
            const entry = await fetchEntry(pageTitle);
            
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
    async function getPageVersionForChapter(pageTitle) {
        try {
            // Load the entry data
            const entry = await fetchEntry(pageTitle);
            
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
    
    // Toggle open/close book
    toggleButton.addEventListener('click', function() {
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
    
    // Update page content based on current pageTitle
    async function updatePage() {
        try {
            // Show loading indicator
            pageContent.innerHTML = '<p>Loading...</p>';
            
            // Get the appropriate version for current chapter
            const pageVersion = await getPageVersionForChapter(currentPageTitle);
            
            if (!pageVersion) {
                pageContent.innerHTML = '<p>Page not available for your current chapter.</p>';
                return;
            }
            
            // Update the page content
            pageTitle.textContent = currentPageTitle;
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
                currentPageTitle = pageHistory[pageHistory.length - 1];
                updatePage();
            }
        });
    }
    
    // Set up page links in the current content
    function setupPageLinksInContent() {
        const pageLinks = document.querySelectorAll('.page-link');
        pageLinks.forEach(link => {
            // Convert from data-index to data-page-title if needed
            if (link.hasAttribute('data-index') && !link.hasAttribute('data-page-title')) {
                // For backward compatibility with old links format
                const indexValue = link.getAttribute('data-index');
                if (wikiMetadata.entries[indexValue]) {
                    link.setAttribute('data-page-title', wikiMetadata.entries[indexValue].title);
                }
            }
        });
    }
    
    // Set up global page link click handlers
    function setupPageLinks() {
        // Using event delegation for page links
        document.addEventListener('click', function(e) {
            // Check if the clicked element is a page link
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                
                // Get target page title (prefer data-page-title, fall back to data-index for compatibility)
                let targetPageTitle;
                
                if (e.target.hasAttribute('data-page-title')) {
                    targetPageTitle = e.target.getAttribute('data-page-title');
                } else if (e.target.hasAttribute('data-index')) {
                    // For backward compatibility
                    const targetIndex = parseInt(e.target.getAttribute('data-index'));
                    if (wikiMetadata.entries[targetIndex]) {
                        targetPageTitle = wikiMetadata.entries[targetIndex].title;
                    }
                }
                
                if (targetPageTitle) {
                    // Check if the page is available for current chapter
                    isPageAvailable(targetPageTitle).then(available => {
                        if (available) {
                            // Store the new page in history
                            currentPageTitle = targetPageTitle;
                            pageHistory.push(currentPageTitle);
                            updatePage();
                        } else {
                            console.log(`Page ${targetPageTitle} not available for chapter ${currentChapter}`);
                        }
                    });
                }
            }
        });
    }
    
    // Initialize the book
    initBook();
});