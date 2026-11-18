/* 링크 설정 (이 파일만 수정하면 됩니다)
   HOME_URL: 과목 소개 페이지(=전체 프로젝트) 주소. 페이지 완성 후 입력. 예: "../index.html"
             비워 두면 홈 아이콘은 동작하지 않습니다.
   PRODUCT_LINKS: 지도 핀 1~3이 연결할 제품 페이지 주소. 제품 페이지 완성 후 입력. 예: "./PRODUCT01/index.html"
             비워 두면 핀 클릭이 동작하지 않습니다. */
export const HOME_URL = "";
export const PRODUCT_LINKS = ["", "", "./PRODUCT03/index.html"];
/* PRODUCT_DIRS: 핀 1~3에 대응하는 제품 폴더. 핀 호버 카드가 이 폴더의
   assets/images/product-hero.webp 와 assets/content/product.json (제품명·한 문장)을 읽어 옵니다.
   폴더 이름을 바꾸지 않았다면 수정할 필요가 없습니다. */
export const PRODUCT_DIRS = ["./PRODUCT01", "./PRODUCT02", "./PRODUCT03"];
/* PIN_ANCHORS: 3D 지도(environment.glb)에서 핀 1~3을 세울 오브젝트 이름. 핀은 그 오브젝트 꼭대기에 선다.
   모델에 pin-01, pin-02, pin-03 이라는 이름의 오브젝트가 있으면 그것이 먼저 쓰인다.
   핀 위치를 바꾸려면 블렌더의 오브젝트 이름(Outliner에 보이는 이름)으로 바꿔 적으면 됩니다. */
export const PIN_ANCHORS = ["Cube.067", "Cylinder", "Cube.008"];
