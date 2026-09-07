

const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('nav');

menuBtn.addEventListener('click', () => {
  nav.classList.toggle('mobile-open');
});

document.querySelectorAll('nav a').forEach(a => {

  a.addEventListener('click', () => {

    if(window.innerWidth <= 850){
      nav.classList.remove('mobile-open');
    }

  });

});

