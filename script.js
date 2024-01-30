document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', adjustHeaderSize);
});
function adjustHeaderSize() {
    const header = document.querySelector('header');
    const profilePicture = document.querySelector('.profile-picture');
    const headerHeight = header.offsetHeight;
    const scrollTop = window.scrollY;

    if (scrollTop > headerHeight) {
        header.style.paddingTop = '10px';
        header.style.paddingBottom = '10px';
        profilePicture.style.width = '100px'; // Adjust size as needed
        profilePicture.style.height = '100px'; // Adjust size as needed
    } else {
        header.style.paddingTop = '20px';
        header.style.paddingBottom = '20px';
        profilePicture.style.width = '150px'; // Adjust size as needed
        profilePicture.style.height = '150px'; // Adjust size as needed
    }
}
