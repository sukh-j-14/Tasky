// Shared navigation functionality
class Navigation {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.loadUserProfile();
        this.setupEventListeners();
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginState();
                return;
            }

            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.showLoggedInState();
            } else {
                this.showLoginState();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.showLoginState();
        }
    }

    showLoginState() {
        // Hide profile dropdown, show login/signup buttons
        const profileSection = document.getElementById('profileSection');
        const loginSection = document.getElementById('loginSection');
        
        if (profileSection) profileSection.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        
        // Update Post Task button to redirect to login
        this.updatePostTaskButton(false);
    }

    showLoggedInState() {
        // Show profile dropdown, hide login/signup buttons
        const profileSection = document.getElementById('profileSection');
        const loginSection = document.getElementById('loginSection');
        
        console.log('Showing logged in state');
        
        if (profileSection) {
            profileSection.style.display = 'block';
            console.log('Profile section shown');
            
            // Update profile image and name if elements exist
            const profileImage = document.getElementById('profileImage');
            const profileName = document.getElementById('profileName');
            
            if (profileImage) {
                profileImage.src = this.currentUser.profilePicture || 'https://via.placeholder.com/40';
                profileImage.alt = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
            
            if (profileName) {
                profileName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
            
            // Update profile major if element exists
            const profileMajor = document.getElementById('profileMajor');
            if (profileMajor) {
                profileMajor.textContent = this.currentUser.major || 'Student';
            }
        } else {
            console.log('Profile section not found');
        }
        
        if (loginSection) {
            loginSection.style.display = 'none';
            console.log('Login section hidden');
        }
        
        // Update Post Task button to redirect to post task page
        this.updatePostTaskButton(true);
    }

    setupEventListeners() {
        // Profile dropdown toggle
        const profileDropdown = document.getElementById('profileDropdown');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (profileDropdown && dropdownMenu) {
            console.log('Setting up dropdown event listeners');
            
            // Remove any existing event listeners to prevent duplicates
            const newProfileDropdown = profileDropdown.cloneNode(true);
            profileDropdown.parentNode.replaceChild(newProfileDropdown, profileDropdown);
            
            newProfileDropdown.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Profile dropdown clicked, toggling menu');
                dropdownMenu.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!newProfileDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.add('hidden');
                }
            });

            // Prevent dropdown from closing when clicking inside it
            dropdownMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            console.log('Dropdown event listeners set up successfully');
        } else {
            console.log('Profile dropdown elements not found:', {
                profileDropdown: !!profileDropdown,
                dropdownMenu: !!dropdownMenu
            });
        }

        // Logout functionality
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Post Task button functionality
        const postTaskBtn = document.getElementById('postTaskButton');
        if (postTaskBtn) {
            postTaskBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePostTaskClick();
            });
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    updatePostTaskButton(isLoggedIn) {
        const postTaskBtn = document.getElementById('postTaskButton');
        if (postTaskBtn) {
            if (isLoggedIn) {
                // User is logged in, button should go to post task page
                postTaskBtn.href = 'posttask.html';
                postTaskBtn.title = 'Post a new task';
            } else {
                // User is not logged in, button should go to login page
                postTaskBtn.href = 'login.html';
                postTaskBtn.title = 'Login to post a task';
            }
        }
    }

    handlePostTaskClick() {
        const token = localStorage.getItem('token');
        if (token) {
            // User is logged in, redirect to post task page
            window.location.href = 'posttask.html';
        } else {
            // User is not logged in, redirect to login page
            window.location.href = 'login.html';
        }
    }

    // Static method to get current user
    static getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure all elements are ready
    setTimeout(() => {
        window.navigation = new Navigation();
    }, 100);
});
