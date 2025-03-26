// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navOverlay = document.querySelector('.nav-overlay');
    let lastScrollTop = 0;
    const scrollThreshold = 100; // Minimum scroll amount before hiding

    // Function to handle scroll behavior
    function handleScroll() {
        if (!header) return; // Exit if header not found
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Only start hiding after scrolling past the threshold
        if (scrollTop > scrollThreshold) {
            if (scrollTop > lastScrollTop) {
                // Scrolling down
                header.classList.add('hide');
            } else {
                // Scrolling up
                header.classList.remove('hide');
            }
        } else {
            // At the top of the page
            header.classList.remove('hide');
        }
        
        lastScrollTop = scrollTop;
    }

    // Function to handle mobile menu
    function handleMobileMenu() {
        if (!menuToggle || !navLinks || !navOverlay) return; // Exit if elements not found

        // Function to close menu
        function closeMenu() {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
        }

        // Function to toggle menu
        function toggleMenu() {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            navOverlay.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        }

        menuToggle.addEventListener('click', toggleMenu);
        navOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                closeMenu();
            }
        });

        // Close menu on window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
                closeMenu();
            }
        });
    }

    // Initialize scroll behavior and mobile menu
    window.addEventListener('scroll', handleScroll);
    handleMobileMenu();
}); 