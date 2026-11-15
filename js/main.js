import { HOME_URL } from './config.js';

const $ = (s) => document.querySelector(s);

// 홈 아이콘: 과목 소개 페이지로 이동 (주소는 config.js)
const home = $('#home-link');
if (HOME_URL) {
  home.href = HOME_URL;
} else {
  home.removeAttribute('href');
  home.setAttribute('aria-disabled', 'true');
  home.addEventListener('click', (e) => e.preventDefault());
}

// 로고: 조별 페이지 상단 복귀
$('#logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// GNB 섹션 이동
document.querySelectorAll('[data-nav]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(a.dataset.nav);
    if (target) window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  });
});

// 텍스트 원고가 비어 있는 곳 표시 (내용 입력 필요)
document.querySelectorAll('[data-missing]').forEach((el) => el.classList.add('is-missing'));
