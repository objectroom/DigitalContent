import { HOME_URL } from './config.js';

// 홈 아이콘: 과목 소개 페이지(전체 프로젝트)로 이동. 주소는 config.js 에서만 수정
const home = document.getElementById('home-link');
if (HOME_URL) {
  home.href = HOME_URL;
} else {
  home.removeAttribute('href');
  home.setAttribute('aria-disabled', 'true');
  home.addEventListener('click', (e) => e.preventDefault());
}
// 로고 클릭 → 페이지 상단 복귀는 js/site.js (data-go="intro")
