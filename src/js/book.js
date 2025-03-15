document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const book = document.getElementById('magic-book');
    const toggleButton = document.getElementById('toggle-book');
    const pageContent = document.getElementById('page-content');
    const currentPageTitle = document.getElementById('current-page-title');
    
    // State variables
    let isOpen = false;
    let currentPageIndex = 0;
    
    // Initialize the book
    function initBook() {
        // Load pages from JSON
        fetchPages()
            .then(pagesData => {
                // Store pages globally
                window.bookPages = pagesData;
                
                // Display the first page
                updatePage();
                
                // Set up page link event delegation
                setupPageLinks();
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
        isOpen = !isOpen;
        book.style.transform = isOpen ? 'rotateY(180deg)' : 'rotateY(0deg)';
    });
    
    // Update page content based on current index
    function updatePage() {
        const page = window.bookPages[currentPageIndex];
        currentPageTitle.textContent = page.title;
        pageContent.innerHTML = page.content;
        
        // Set up page links after page update
        setupPageLinks();
    }
    
    // Set up page link click handlers
    function setupPageLinks() {
        // Using event delegation for page links
        pageContent.addEventListener('click', function(e) {
            // Check if the clicked element is a page link
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                const targetIndex = parseInt(e.target.getAttribute('data-index'));
                if (targetIndex >= 0 && targetIndex < window.bookPages.length) {
                    currentPageIndex = targetIndex;
                    updatePage();
                }
            }
        });
    }
    
    // Initialize the book
    initBook();
});