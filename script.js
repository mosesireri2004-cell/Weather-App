const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";

const weatherDescriptions = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Freezing drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "🌨️" },
  80: { label: "Light showers", icon: "🌦️" },
  81: { label: "Showers", icon: "🌧️" },
  82: { label: "Heavy showers", icon: "🌧️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Thunderstorm with hail", icon: "⛈️" },
};

const elements = {
  status: document.querySelector("#status-message"),
  searchForm: document.querySelector("#search-form"),
  citySearch: document.querySelector("#city-search"),
  locationButton: document.querySelector("#location-button"),
  cityName: document.querySelector("#city-name"),
  currentDate: document.querySelector("#current-date"),
  currentIcon: document.querySelector("#current-icon"),
  temperature: document.querySelector("#current-temperature"),
  condition: document.querySelector("#condition-label"),
  feelsLike: document.querySelector("#feels-like"),
  highLow: document.querySelector("#current-high-low"),
  summary: document.querySelector("#current-summary"),
  highlightsDate: document.querySelector("#highlights-date"),
  humidity: document.querySelector("#humidity"),
  humidityNote: document.querySelector("#humidity-note"),
  windSpeed: document.querySelector("#wind-speed"),
  windDirection: document.querySelector("#wind-direction"),
  rainChance: document.querySelector("#rain-chance"),
  sunriseSunset: document.querySelector("#sunrise-sunset"),
  forecastList: document.querySelector("#forecast-list"),
  hourlyList: document.querySelector("#hourly-list"),
};

let selectedUnit = "c";
let latestWeather = null;
let requestNumber = 0;

function getWeatherInfo(code) {
  return weatherDescriptions[code] ?? { label: "Variable conditions", icon: "🌡️" };
}

function displayTemperature(value) {
  const converted = selectedUnit === "f" ? (value * 9) / 5 + 32 : value;
  return `${Math.round(converted)}°`;
}

function displaySpeed(value) {
  const converted = selectedUnit === "f" ? value * 0.621371 : value;
  return `${Math.round(converted)} ${selectedUnit === "f" ? "mph" : "km/h"}`;
}

function formatTime(dateTime) {
  const [date, time] = dateTime.split("T");
  if (!date || !time) return "—";
  const utcDate = new Date(`${date}T${time}:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(utcDate);
}

function formatDate(dateString, options) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(
    new Date(`${dateString}T12:00:00Z`),
  );
}

function windDirection(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % directions.length];
}

function getLocationName(location) {
  return [location.name, location.admin1, location.country]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(", ");
}

async function fetchWeather(location) {
  const currentRequest = ++requestNumber;
  setStatus(`Loading weather for ${location.name}...`, false);
  elements.cityName.textContent = location.displayName || location.name;

  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    forecast_days: "5",
    timezone: "auto",
  });

  try {
    const response = await fetch(`${API_BASE}?${params}`);
    if (!response.ok) throw new Error("Weather data is temporarily unavailable.");
    const data = await response.json();
    if (currentRequest !== requestNumber) return;
    latestWeather = { data, location };
    renderWeather(data, location);
    setStatus(`Live weather · Updated ${formatTime(data.current.time)}`, false);
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    setStatus(error.message || "Could not load weather. Please try again.", true);
  }
}

function renderWeather(data, location) {
  const { current, daily, hourly } = data;
  const today = daily.time[0];
  const info = getWeatherInfo(current.weather_code);
  const foundHour = hourly.time.findIndex((time) => time >= current.time);
  const hourlyStart = foundHour < 0 ? 0 : foundHour;
  const rainProbabilities = hourly.precipitation_probability.slice(hourlyStart, hourlyStart + 6);
  const rainChance = rainProbabilities.length
    ? Math.max(...rainProbabilities.map((value) => value ?? 0))
    : 0;

  elements.cityName.textContent = location.displayName || location.name;
  elements.currentDate.textContent = formatDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  elements.highlightsDate.textContent = formatDate(today, { month: "short", day: "numeric" });
  elements.currentIcon.textContent = info.icon;
  elements.temperature.textContent = displayTemperature(current.temperature_2m);
  elements.condition.textContent = info.label;
  elements.feelsLike.textContent = displayTemperature(current.apparent_temperature);
  elements.highLow.innerHTML = `H: ${displayTemperature(daily.temperature_2m_max[0])} <span class="footer-divider">/</span> L: ${displayTemperature(daily.temperature_2m_min[0])}`;
  elements.summary.textContent = current.is_day ? "Daytime conditions" : "Tonight's conditions";
  elements.humidity.innerHTML = `${Math.round(current.relative_humidity_2m)}<span class="value-unit">%</span>`;
  elements.humidityNote.textContent =
    current.relative_humidity_2m >= 65
      ? "The air feels quite humid"
      : current.relative_humidity_2m <= 35
        ? "The air feels fairly dry"
        : "Comfortable moisture in the air";
  const speed = displaySpeed(current.wind_speed_10m).split(" ");
  elements.windSpeed.innerHTML = `${speed[0]}<span class="value-unit"> ${speed[1]}</span>`;
  elements.windDirection.textContent = `Direction ${windDirection(current.wind_direction_10m)}`;
  elements.rainChance.innerHTML = `${rainChance}<span class="value-unit">%</span>`;
  elements.sunriseSunset.innerHTML = `${formatTime(daily.sunrise[0])} <span class="sun-arrow">↗</span> ${formatTime(daily.sunset[0])}`;
  renderForecast(daily);
  renderHourly(hourly, hourlyStart);
}

function renderForecast(daily) {
  elements.forecastList.innerHTML = daily.time
    .map((date, index) => {
      const label = index === 0 ? "Today" : formatDate(date, { weekday: "short" });
      const info = getWeatherInfo(daily.weather_code[index]);
      return `
        <div class="forecast-row">
          <span class="forecast-day">${label}</span>
          <span class="forecast-weather" title="${info.label}">${info.icon}</span>
          <span class="forecast-condition">${info.label}</span>
          <span class="forecast-temperatures">
            <strong>${displayTemperature(daily.temperature_2m_max[index])}</strong>
            <span>${displayTemperature(daily.temperature_2m_min[index])}</span>
          </span>
        </div>`;
    })
    .join("");
}

function renderHourly(hourly, startIndex) {
  const hours = hourly.time.slice(startIndex, startIndex + 6);
  elements.hourlyList.innerHTML = hours
    .map((time, index) => {
      const dataIndex = startIndex + index;
      const info = getWeatherInfo(hourly.weather_code[dataIndex]);
      const label = index === 0 ? "Now" : formatTime(time);
      return `
        <div class="hourly-item">
          <span class="hourly-time">${label}</span>
          <span class="hourly-icon" title="${info.label}" aria-label="${info.label}">${info.icon}</span>
          <span class="hourly-temperature">${displayTemperature(hourly.temperature_2m[dataIndex])}</span>
          <span class="hourly-rain">${hourly.precipitation_probability[dataIndex] ?? 0}%</span>
        </div>`;
    })
    .join("");
}

function setStatus(message, isError) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
}

async function searchCity(city) {
  const currentRequest = ++requestNumber;
  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });

  setStatus(`Finding ${city}...`, false);
  try {
    const response = await fetch(`${GEOCODING_BASE}?${params}`);
    if (!response.ok) throw new Error("City search is temporarily unavailable.");
    const result = await response.json();
    if (currentRequest !== requestNumber) return;
    const place = result.results?.[0];
    if (!place) throw new Error(`No results found for "${city}". Try another city.`);
    const location = {
      name: place.name,
      displayName: getLocationName(place),
      latitude: place.latitude,
      longitude: place.longitude,
    };
    elements.citySearch.value = "";
    await fetchWeather(location);
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    setStatus(error.message || "Could not search for that city. Please try again.", true);
  }
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = elements.citySearch.value.trim();
  if (city) searchCity(city);
});

elements.locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Location is not supported by this browser.", true);
    return;
  }
  const locationRequest = ++requestNumber;
  setStatus("Finding your location...", false);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (locationRequest !== requestNumber) return;
      fetchWeather({
        name: "Your location",
        displayName: "Your location",
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    },
    (error) => {
      if (locationRequest !== requestNumber) return;
      const message =
        error.code === error.PERMISSION_DENIED
          ? "Location access was denied. You can search for a city instead."
          : "Could not determine your location. Please try again or search for a city.";
      setStatus(message, true);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  );
});

document.querySelectorAll(".unit-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedUnit = button.dataset.unit;
    document.querySelectorAll(".unit-button").forEach((unitButton) => {
      const isActive = unitButton === button;
      unitButton.classList.toggle("is-active", isActive);
      unitButton.setAttribute("aria-pressed", String(isActive));
    });
    if (latestWeather) renderWeather(latestWeather.data, latestWeather.location);
  });
});

fetchWeather({
  name: "London",
  displayName: "London, United Kingdom",
  latitude: 51.5072,
  longitude: -0.1276,
});