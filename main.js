document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateDate();
  fetchWeather();
  fetchNews();
});

function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#theme-toggle i');
  if (theme === 'dark') {
    icon.classList.replace('fa-moon', 'fa-sun');
  } else {
    icon.classList.replace('fa-sun', 'fa-moon');
  }
}

function updateDate() {
  const dateElement = document.getElementById('current-date');
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  dateElement.textContent = now.toLocaleDateString('ko-KR', options);
}

// Weather API (Open-Meteo)
async function fetchWeather() {
  const lat = 37.5665; // Seoul
  const lon = 126.9780;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    displayWeather(data.daily);
  } catch (error) {
    console.error('Weather fetch error:', error);
    document.getElementById('weather-container').innerHTML = '<p class="loading">날씨 정보를 가져오는 데 실패했습니다.</p>';
  }
}

function displayWeather(daily) {
  const container = document.getElementById('weather-container');
  container.innerHTML = '';

  daily.time.forEach((date, index) => {
    const maxTemp = Math.round(daily.temperature_2m_max[index]);
    const minTemp = Math.round(daily.temperature_2m_min[index]);
    const weatherCode = daily.weathercode[index];
    const iconClass = getWeatherIcon(weatherCode);
    const isToday = index === 0;

    const dateObj = new Date(date);
    const dayName = isToday ? '오늘' : dateObj.toLocaleDateString('ko-KR', { weekday: 'short' });
    const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    const card = document.createElement('div');
    card.className = `weather-card ${isToday ? 'today' : ''}`;
    card.innerHTML = `
      <span class="date">${formattedDate} (${dayName})</span>
      <i class="${iconClass}"></i>
      <span class="temp-max">${maxTemp}°</span>
      <span class="temp-range">${minTemp}° / ${maxTemp}°</span>
    `;
    container.appendChild(card);
  });
}

function getWeatherIcon(code) {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return 'fas fa-sun'; // Clear sky
  if (code <= 3) return 'fas fa-cloud-sun'; // Mainly clear, partly cloudy, and overcast
  if (code === 45 || code === 48) return 'fas fa-smog'; // Fog
  if (code <= 67) return 'fas fa-cloud-showers-heavy'; // Drizzle, Rain
  if (code <= 77) return 'fas fa-snowflake'; // Snow
  if (code <= 82) return 'fas fa-cloud-rain'; // Rain showers
  if (code <= 86) return 'fas fa-snowflake'; // Snow showers
  if (code <= 99) return 'fas fa-bolt'; // Thunderstorm
  return 'fas fa-cloud';
}

// News API (RSS via rss2json)
async function fetchNews() {
  // Using Google News KR RSS via rss2json
  const rssUrl = encodeURIComponent('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko');
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'ok') {
      displayNews(data.items);
    } else {
      throw new Error('API status not ok');
    }
  } catch (error) {
    console.error('News fetch error:', error);
    document.getElementById('news-container').innerHTML = '<p class="loading">뉴스 정보를 가져오는 데 실패했습니다.</p>';
  }
}

function displayNews(items) {
  const container = document.getElementById('news-container');
  container.innerHTML = '';

  // Show top 6 news items
  items.slice(0, 6).forEach(item => {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    // Use a placeholder if no thumbnail is available
    const thumbnail = item.thumbnail || 'https://via.placeholder.com/300x180?text=News';
    
    const pubDate = new Date(item.pubDate).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    card.innerHTML = `
      <img src="${thumbnail}" alt="news thumbnail">
      <div class="news-content">
        <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
        <p>${item.description.replace(/<[^>]*>?/gm, '').slice(0, 100)}...</p>
        <div class="news-meta">
          <span>${item.author || '뉴스'}</span> | <span>${pubDate}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
