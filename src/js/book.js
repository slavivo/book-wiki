document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const book = document.getElementById('magic-book');
    const toggleButton = document.getElementById('toggle-book');
    const pageContent = document.getElementById('page-content');
    const currentPageTitle = document.getElementById('current-page-title');
    const backButton = document.getElementById('back-button');
    
    // Initially hide the back button
    backButton.style.display = 'none';
    
    // State variables
    let isOpen = false;
    let currentPageIndex = 0;
    let pageHistory = []; // Array to store visited page indices
    
    // Initialize the book
    function initBook() {
        // Set initial state of book
        book.classList.add('closed');
        document.querySelector('.book-pages').style.pointerEvents = 'none';
        
        // Load pages from JSON
        fetchPages()
            .then(pagesData => {
                // Store pages globally
                window.bookPages = pagesData;
                
                // Add first page to history and display it
                pageHistory.push(currentPageIndex);
                updatePage();

                // Set up page links
                setupPageLinks();
            
                // Set up back button
                setupBackButton();
            })
            .catch(error => {
                console.error('Error loading pages:', error);
            });
    }
    
    // Fetch pages from JSON file
    async function fetchPages() {
        try {
            const response = await fetch('./content/entries.json');
            const data = await response.json();
            return data.pages;
        } catch (error) {
            throw new Error('Failed to load pages from JSON');
        }
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
    
    // Update page content based on current index
    function updatePage() {
        const page = window.bookPages[currentPageIndex];
        currentPageTitle.textContent = page.title;
        pageContent.innerHTML = page.content;
        updateBackButtonVisibility();
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
                currentPageIndex = pageHistory[pageHistory.length - 1];
                updatePage();
            }
        });
    }
    
    // Set up page link click handlers - only call this ONCE
    function setupPageLinks() {
        console.log('Setting up page links');
        // Using event delegation for page links
        document.addEventListener('click', function(e) {
            // Log what was clicked for debugging
            console.log('Clicked element:', e.target);
            
            // Check if the clicked element is a page link
            if (e.target.classList.contains('page-link')) {
                console.log('Page link clicked:', e.target);
                e.preventDefault();
                const targetIndex = parseInt(e.target.getAttribute('data-index'));
                if (targetIndex >= 0 && targetIndex < window.bookPages.length) {
                    // Store the new page in history
                    currentPageIndex = targetIndex;
                    pageHistory.push(currentPageIndex);
                    updatePage();
                }
            }
        });
    }
    
    // Initialize the book
    initBook();
});