document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const book = document.getElementById('magic-book');
    const toggleButton = document.getElementById('toggle-book');
    const contentsButton = document.getElementById('contents-button');
    const nextButton = document.getElementById('next-button');
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
                
                // Reveal hidden content gradually
                setTimeout(revealHiddenContent, 1000);
                
                // Initialize rune hover effects
                initRuneEffects();
                
                // Set up page link event delegation
                setupPageLinks();
            })
            .catch(error => {
                console.error('Error loading pages:', error);
                // Fallback to sample content if JSON loading fails
                window.bookPages = getSamplePages();
                updatePage();
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
    
    // Fallback sample pages
    function getSamplePages() {
        return [
            {
                title: "Introduction",
                content: `
                    <div class="ink-splatter ink-splatter-1"></div>
                    <div class="ink-splatter ink-splatter-2"></div>
                    
                    <p>I never intended to become a chronicler of magic. My journey began as a simple scholar at the Academy, content with studying the theories of others. But fate has a way of pushing us down unexpected paths.</p>
                    
                    <p>When I discovered the strange crystal in the mountains of Eldrath, I could not have known how it would change everything. This book shall serve as my record of all I learn about the magical systems of our world, the creatures that inhabit it, and the ancient powers that still linger in forgotten places.</p>
                    
                    <p>As I uncover more secrets, I will add to these pages. Perhaps someday, another seeker will find this tome useful in their own quest for understanding.</p>
                    
                    <p>I have organized this compendium into sections based on my discoveries. Navigate through the contents to explore what I have learned thus far.</p>
                    
                    <p class="reveal">Be warned - some knowledge comes with a price. The <span class="rune">ᚠᛟᚱᛒᛁᛞᛞᛖᚾ</span> sections contain information that may be dangerous to the unprepared mind.</p>
                    
                    <p>~ <em>Lyra Moonshadow, Arcane Scholar</em></p>
                    
                    <div class="watermark">Property of the Royal Arcane Academy</div>
                    <div class="torn-edge"></div>
                `
            },
            {
                title: "Contents",
                content: `
                    <div class="ink-splatter ink-splatter-1"></div>
                    
                    <h2>The Known Magical Systems</h2>
                    <p><span class="page-link" data-index="2">Elemental Binding</span> - The art of harnessing the four primal elements</p>
                    <p><span class="page-link" data-index="3">Runic Inscriptions</span> - Ancient symbols that channel power when properly arranged</p>
                    <p class="reveal"><span class="page-link" data-index="4">Soul Harmony</span> - The delicate practice of attuning one's soul to magical frequencies</p>
                    
                    <h2>Magical Creatures</h2>
                    <p><span class="page-link" data-index="5">Crystal Guardians</span> - Sentient formations born from magical mineral deposits</p>
                    <p class="reveal"><span class="page-link" data-index="6">Shadow Wisps</span> - Ethereal beings that exist between our world and the void</p>
                    
                    <h2>Magical Locations</h2>
                    <p><span class="page-link" data-index="7">The Whispering Caverns</span> - Where echoes of ancient spells still linger</p>
                    
                    <h2 class="reveal">Forbidden Knowledge</h2>
                    <p class="reveal"><span class="page-link rune" data-index="8">ᚦᛖ ᚹᛟᛁᛞ ᚱᛁᛏᛖᛊ</span> - I should not speak of this openly</p>
                    
                    <div class="watermark">Property of the Royal Arcane Academy</div>
                    <div class="torn-edge"></div>
                `
            },
            {
                title: "Elemental Binding",
                content: `
                    <div class="ink-splatter ink-splatter-1"></div>
                    <div class="ink-splatter ink-splatter-2"></div>
                    
                    <p>My first significant discovery was the true nature of Elemental Binding. Unlike the simplified version taught at the Academy, true Elemental Binding involves forming a sympathetic connection with the elemental plane itself.</p>
                    
                    <h3>The Four Elements and Their Aspects</h3>
                    <p>Fire is not merely flame, but encompasses heat, transformation, and passion. Water includes not just liquid, but mist, ice, and the concepts of flow and change. Earth represents solidity, endurance, growth, and foundation. Air embodies movement, thought, breath, and invisibility.</p>
                    
                    <p>The binding ritual requires a focus object that resonates with the element's frequency:</p>
                    <ul>
                        <li>Fire - Obsidian, forged in flame, works best</li>
                        <li>Water - Pearl or mother-of-pearl, shaped by the sea</li>
                        <li>Earth - Raw, uncut crystal that has never seen sunlight</li>
                        <li>Air - Feather from a creature that spends its life aloft</li>
                    </ul>
                    
                    <p class="reveal">I have discovered that a fifth element may exist, though its nature eludes me still. In ancient texts, it is referred to only as <span class="rune">ᛖᚦᛖᚱ</span>, the binding force between all other elements.</p>
                    
                    <p><span class="page-link" data-index="1">Return to Contents</span></p>
                    
                    <div class="watermark">Property of the Royal Arcane Academy</div>
                    <div class="torn-edge"></div>
                `
            }
        ];
    }
    
    // Toggle open/close book
    toggleButton.addEventListener('click', function() {
        isOpen = !isOpen;
        book.style.transform = isOpen ? 'rotateY(180deg)' : 'rotateY(0deg)';
    });
    
    // Show contents page
    contentsButton.addEventListener('click', function() {
        currentPageIndex = 1; // Contents is page index 1
        updatePage();
    });
    
    // Next page
    nextButton.addEventListener('click', function() {
        if (currentPageIndex < window.bookPages.length - 1) {
            currentPageIndex++;
            updatePage();
        }
    });
    
    // Update page content based on current index
    function updatePage() {
        const page = window.bookPages[currentPageIndex];
        currentPageTitle.textContent = page.title;
        pageContent.innerHTML = page.content;
        
        // Reveal hidden content gradually
        setTimeout(revealHiddenContent, 1000);
        
        // Initialize rune effects after page update
        initRuneEffects();
        
        // Set up page links after page update
        setupPageLinks();
    }
    
    // Reveal hidden content gradually
    function revealHiddenContent() {
        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('active');
            }, index * 500);
        });
    }
    
    // Initialize rune hover effects
    function initRuneEffects() {
        document.querySelectorAll('.rune').forEach(rune => {
            rune.addEventListener('mouseover', function() {
                this.classList.add('glowing-text');
            });
            
            rune.addEventListener('mouseout', function() {
                this.classList.remove('glowing-text');
            });
        });
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