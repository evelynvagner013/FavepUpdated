// controllers/weatherController.js
const axios = require('axios');
const API_KEY = process.env.WEATHER_API_KEY;

exports.getWeather = async (req, res) => {
  const { lat, lon, cidade } = req.query;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Chave da API de clima não configurada no servidor.' });
  }

  let url = '';

  // 🔍 Busca por cidade
  if (cidade) {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${API_KEY}&units=metric&lang=pt_br`;
  }
  // 🌎 Busca por coordenadas
  else if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`;
  }
  // 🏙️ Padrão: Taquaritinga
  else {
    url = `https://api.openweathermap.org/data/2.5/weather?lat=-21.4056&lon=-48.5133&appid=${API_KEY}&units=metric&lang=pt_br`;
  }

  try {
    const response = await axios.get(url);
    const data = response.data;

    const weatherData = {
      temperatura: data.main.temp,
      sensacaoTermica: data.main.feels_like,
      descricao: data.weather[0].description,
      icone: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
      cidade: data.name
    };

    res.status(200).json(weatherData);
  } catch (error) {
    console.error("Erro ao buscar dados do clima:", error.response?.data || error.message);
    res.status(500).json({ error: 'Não foi possível obter os dados do clima.' });
  }
};
