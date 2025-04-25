// 전역 변수 선언
let map;
let markers = [];
let diveShops = [];

// CSV 파일 로드 및 파싱
fetch('./philippines_dive_shops.csv')  // 경로 수정
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  })
  .then(csvData => {
    console.log('CSV 데이터 로드됨:', csvData.substring(0, 100)); // 디버깅용 로그
    const parsed = Papa.parse(csvData, {header: true});
    diveShops = parsed.data.map(shop => ({
      name: shop.name,
      region: shop.region,
      address: shop.address,
      website: shop.website,
      phone: shop.phone,
      rating: parseFloat(shop.rating) || 0,
      total_ratings: parseInt(shop.total_ratings) || 0,
      lat: parseFloat(shop.lat),
      lng: parseFloat(shop.lng),
      korean_support: false
    }));
    
    initializeWithData(diveShops);
  })
  .catch(error => {
    console.error('CSV 파일 로딩 에러 상세:', error);
    document.getElementById('loading').textContent = '데이터 로딩 실패';
  });

// 데이터 초기화 함수
function initializeWithData(shops) {
    diveShops = shops;
    initMap();
    initializeRegionFilter();
    filterShops(); // 초기 필터링 적용
}

function initMap() {
    const philippines = { lat: 12.8797, lng: 121.7740 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 6,
        center: philippines
    });
    
    diveShops.forEach(shop => {
        addMarker(shop);
    });
}
  
function addMarker(shop) {
    const marker = new google.maps.Marker({
        position: { lat: shop.lat, lng: shop.lng },
        map: map,
        title: shop.name
    });
    
    marker.addListener('click', () => {
        showShopDetails(shop);
        centerMapOnShop(shop);  // 마커 클릭 시 센터링 및 줌 기능 추가
    });
    
    markers.push(marker);
  }

  function filterShops() {
    console.log('필터링 시작'); // 디버깅 로그

    const regionFilter = document.getElementById('region-filter').value;
    const koreanFilter = document.getElementById('korean-filter').value;
    const ratingFilter = parseFloat(document.getElementById('rating-filter').value);
    const searchQuery = document.getElementById('search').value.toLowerCase();

    console.log('필터 값들:', { regionFilter, koreanFilter, ratingFilter, searchQuery }); // 디버깅 로그

    const filteredShops = diveShops.filter(shop => {
        const matchesRegion = regionFilter === 'all' || shop.region === regionFilter;
        const matchesKorean = koreanFilter === 'all' || 
            (koreanFilter === 'yes' && shop.korean_support) ||
            (koreanFilter === 'no' && !shop.korean_support);
        const matchesRating = shop.rating >= ratingFilter;
        const matchesSearch = shop.name.toLowerCase().includes(searchQuery) ||
                            shop.region.toLowerCase().includes(searchQuery);

        return matchesRegion && matchesKorean && matchesRating && matchesSearch;
    });

    console.log('필터링된 샵 개수:', filteredShops.length); // 디버깅 로그

    updateMarkers(filteredShops);
    updateShopList(filteredShops);
}

function updateMarkers(filteredShops) {
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // 새 마커 추가
    filteredShops.forEach(shop => {
        addMarker(shop);
    });
}

function updateShopList(filteredShops) {
    const shopList = document.getElementById('shop-list');
    if (!shopList) {
        console.error('shop-list 엘리먼트를 찾을 수 없습니다.');
        return;
    }
    
    shopList.innerHTML = '';

    // markers 배열과 filteredShops 배열의 인덱스를 맞추기 위해 마커도 함께 업데이트
    markers = [];
    filteredShops.forEach((shop, index) => {
        // 마커 추가
        const marker = new google.maps.Marker({
            position: { lat: parseFloat(shop.lat), lng: parseFloat(shop.lng) },
            map: map,
            title: shop.name
        });
        
        markers.push(marker);

        const shopCard = document.createElement('div');
        shopCard.className = 'shop-card';
        
        // 클릭 이벤트를 shop-name div에만 추가
        const nameDiv = document.createElement('div');
        nameDiv.className = 'shop-name';
        nameDiv.textContent = shop.name;
        nameDiv.addEventListener('click', () => {
            console.log('샵 이름 클릭됨:', shop.name);
            showShopDetails(shop);
            centerMapOnShop(shop);
            highlightMarker(index);
        });

        shopCard.appendChild(nameDiv);
        
        // innerHTML 대신 appendChild 사용하여 기존 이벤트 리스너 유지
        const regionDiv = document.createElement('div');
        regionDiv.className = 'shop-region';
        regionDiv.textContent = shop.region;
        shopCard.appendChild(regionDiv);

        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'shop-rating';
        ratingDiv.textContent = `★ ${shop.rating.toFixed(1)} (${shop.total_ratings})`;
        shopCard.appendChild(ratingDiv);

        const contactDiv = document.createElement('div');
        contactDiv.className = 'shop-contact';
        contactDiv.textContent = shop.phone;
        shopCard.appendChild(contactDiv);
        
        shopList.appendChild(shopCard);
    });
}

function showShopDetails(shop) {
    const detailsElement = document.getElementById('shop-details');
    
    // 상세 정보 업데이트
    document.getElementById('detail-name').textContent = shop.name;
    document.getElementById('detail-region').textContent = shop.region;
    document.getElementById('detail-rating').textContent = `★ ${shop.rating.toFixed(1)} (${shop.total_ratings})`;
    document.getElementById('detail-address').textContent = shop.address;
    document.getElementById('detail-phone').textContent = shop.phone;
    
    // 웹사이트 링크 설정
    const websiteLink = document.getElementById('detail-website');
    if (shop.website) {
        websiteLink.href = shop.website;
        websiteLink.style.display = 'inline-block';
    } else {
        websiteLink.style.display = 'none';
    }
    
    // 상세 정보 패널 표시
    detailsElement.style.display = 'block';
}

function closeDetails() {
    document.getElementById('shop-details').style.display = 'none';
}

// 마커 센터링 함수 수정
function centerMapOnShop(shop) {
    const position = { lat: parseFloat(shop.lat), lng: parseFloat(shop.lng) };
    
    // 줌 애니메이션 추가
    map.setZoom(15);  // 먼저 줌 레벨 설정
    map.panTo(position);  // 그 다음 위치로 이동
}

// 마커 하이라이트 함수 추가
function highlightMarker(index) {
    // 먼저 모든 마커를 기본 스타일로 되돌림
    markers.forEach(marker => {
        marker.setAnimation(null);
    });
    
    // 선택된 마커에 바운스 애니메이션 적용
    if (markers[index]) {
        markers[index].setAnimation(google.maps.Animation.BOUNCE);
        // 2초 후 애니메이션 중지
        setTimeout(() => {
            markers[index].setAnimation(null);
        }, 2000);
    }
}

// 이벤트 리스너 등록
document.getElementById('region-filter').addEventListener('change', filterShops);
document.getElementById('korean-filter').addEventListener('change', filterShops);
document.getElementById('rating-filter').addEventListener('change', filterShops);
document.getElementById('search').addEventListener('input', filterShops);

// 지역 필터 옵션 초기화
function initializeRegionFilter() {
    const regions = [...new Set(diveShops.map(shop => shop.region))].sort();
    const regionFilter = document.getElementById('region-filter');
    
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });
}