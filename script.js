/**
 * Skyline Weather — Open-Meteo API (no key required)
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const weatherCodeMap = {
  0: { desc: 'Clear sky', emoji: '☀️' },
  1: { desc: 'Mainly clear', emoji: '🌤️' },
  2: { desc: 'Partly cloudy', emoji: '⛅' },
  3: { desc: 'Overcast', emoji: '☁️' },
  45: { desc: 'Foggy', emoji: '🌫️' },
  48: { desc: 'Depositing rime fog', emoji: '🌫️' },
  51: { desc: 'Light drizzle', emoji: '🌧️' },
  53: { desc: 'Moderate drizzle', emoji: '🌧️' },
  55: { desc: 'Dense drizzle', emoji: '🌧️' },
  61: { desc: 'Slight rain', emoji: '🌧️' },
  63: { desc: 'Moderate rain', emoji: '🌧️' },
  65: { desc: 'Heavy rain', emoji: '🌧️' },
  66: { desc: 'Light freezing rain', emoji: '🌨️' },
  67: { desc: 'Heavy freezing rain', emoji: '🌨️' },
  71: { desc: 'Slight snow', emoji: '❄️' },
  73: { desc: 'Moderate snow', emoji: '❄️' },
  75: { desc: 'Heavy snow', emoji: '❄️' },
  77: { desc: 'Snow grains', emoji: '❄️' },
  80: { desc: 'Slight rain showers', emoji: '🌦️' },
  81: { desc: 'Moderate rain showers', emoji: '🌦️' },
  82: { desc: 'Violent rain showers', emoji: '🌧️' },
  85: { desc: 'Slight snow showers', emoji: '🌨️' },
  86: { desc: 'Heavy snow showers', emoji: '🌨️' },
  95: { desc: 'Thunderstorm', emoji: '⛈️' },
  96: { desc: 'Thunderstorm with slight hail', emoji: '⛈️' },
  99: { desc: 'Thunderstorm with heavy hail', emoji: '⛈️' },
};

function getWeatherInfo(code) {
  return weatherCodeMap[code] || { desc: 'Unknown', emoji: '🌡️' };
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

const elements = {
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  main: document.querySelector('.main'),
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  cityName: document.getElementById('cityName'),
  country: document.getElementById('country'),
  currentTemp: document.getElementById('currentTemp'),
  weatherDesc: document.getElementById('weatherDesc'),
  weatherEmoji: document.getElementById('weatherEmoji'),
  feelsLike: document.getElementById('feelsLike'),
  humidity: document.getElementById('humidity'),
  windSpeed: document.getElementById('windSpeed'),
  forecastList: document.getElementById('forecastList'),
};

function setState(state) {
  elements.main.classList.remove('loading', 'error', 'ready');
  elements.main.classList.add(state);
}

async function geocodeCity(query) {
  const params = new URLSearchParams({
    name: query.trim(),
    count: 1,
    language: 'en',
    format: 'json',
  });
  const res = await fetch(`${GEOCODE_URL}?${params}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const { name, country_code, latitude, longitude, timezone } = data.results[0];
  return { name, country_code, latitude, longitude, timezone };
}

async function fetchWeather(lat, lon, timezone) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone,
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days: 7,
  });
  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

function renderCurrent(data, locationName, countryCode) {
  const cur = data.current;
  const info = getWeatherInfo(cur.weather_code);

  elements.cityName.textContent = locationName;
  elements.country.textContent = countryCode;
  elements.currentTemp.textContent = Math.round(cur.temperature_2m);
  elements.weatherDesc.textContent = info.desc;
  elements.weatherEmoji.textContent = info.emoji;
  elements.feelsLike.textContent = `${Math.round(cur.apparent_temperature)}°`;
  elements.humidity.textContent = `${cur.relative_humidity_2m}%`;
  elements.windSpeed.textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
}

function renderForecast(data) {
  const daily = data.daily;
  elements.forecastList.innerHTML = daily.time.map((dateStr, i) => {
    const code = daily.weather_code[i];
    const info = getWeatherInfo(code);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    return `
      <li>
        <span class="forecast-day">${formatDay(dateStr)}</span>
        <span class="forecast-emoji">${info.emoji}</span>
        <span class="forecast-temps">
          <span>${max}°</span><span>${min}°</span>
        </span>
      </li>
    `;
  }).join('');
}

async function handleSearch(e) {
  e.preventDefault();
  const query = elements.searchInput.value.trim();
  if (!query) return;

  setState('loading');
  try {
    const location = await geocodeCity(query);
    if (!location) {
      setState('error');
      elements.errorText.textContent = 'City not found. Try another name.';
      return;
    }

    const weather = await fetchWeather(
      location.latitude,
      location.longitude,
      location.timezone
    );

    renderCurrent(weather, location.name, location.country_code);
    renderForecast(weather);
    setState('ready');
  } catch (err) {
    setState('error');
    elements.errorText.textContent = 'Could not load weather. Check your connection and try again.';
  }
}

elements.searchForm.addEventListener('submit', handleSearch);

/* Dark/Light theme */
const THEME_KEY = 'skyline-theme';

function getTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(THEME_KEY, theme);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  setTheme(isLight ? 'dark' : 'light');
});

setTheme(getTheme());

// Optional: load default city on first visit
(async function init() {
  const defaultCity = 'London';
  elements.searchInput.placeholder = `e.g. ${defaultCity}, New York, Tokyo`;
  setState('loading');
  try {
    const location = await geocodeCity(defaultCity);
    if (location) {
      const weather = await fetchWeather(
        location.latitude,
        location.longitude,
        location.timezone
      );
      renderCurrent(weather, location.name, location.country_code);
      renderForecast(weather);
      setState('ready');
    } else {
      setState('error');
      elements.errorText.textContent = 'Could not load default weather. Search for a city.';
    }
  } catch {
    setState('error');
    elements.errorText.textContent = 'Could not load weather. Search for a city to get started.';
  }
})();
