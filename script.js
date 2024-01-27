document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', adjustHeaderSize);
});

function adjustHeaderSize() {
    const header = document.querySelector('header');
    const profilePicture = document.querySelector('.profile-picture');
    const headerHeight = header.offsetHeight;
    const scrollTop = window.scrollY;

    if (scrollTop > headerHeight) {
        header.style.paddingTop = '250px';
        header.style.paddingBottom = '250px';
        profilePicture.style.width = '250px'; // Adjust size as needed
        profilePicture.style.height = '250px'; // Adjust size as needed
    } else {
        header.style.paddingTop = '500px';
        header.style.paddingBottom = '500px';
        profilePicture.style.width = '300px'; // Adjust size as needed
        profilePicture.style.height = '300px'; // Adjust size as needed
    }
}