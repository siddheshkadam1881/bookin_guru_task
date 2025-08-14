const axios = require('axios');
require('dotenv').config();
const https = require('https');
const agent = new https.Agent({
    rejectUnauthorized: false // ⚠️ disables certificate verification
});
const express = require('express');
const { count } = require('console');
const app = express();
app.use(express.json());

const API_BASE_URL = process.env.API_BASE_URL || 'https://be-recruitment-task.onrender.com';
const API_USERNAME = process.env.API_USERNAME || 'testuser';
const API_PASSWORD = process.env.API_PASSWORD || 'testpass';
const WIKIPEDIA_API_URL = process.env.WIKIPEDIA_API_URL || 'https://en.wikipedia.org/api/rest_v1/page/summary';
const PORT = process.env.PORT || 5000;

async function getPollutionData(token, country, page, limit) {
    try {
        const response = await axios.get(
            API_BASE_URL + '/pollution',
            {
                params: { country, page, limit },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                httpsAgent: agent
            });
        if (response.status !== 200) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        console.log('Pollution data fetched successfully');
        console.log(`Country: ${country}, Page: ${page}, Limit: ${limit}`);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}


async function getToken() {
    try {
        const loginResponse = await axios.post(
            API_BASE_URL + '/auth/login',
            {
                username: API_USERNAME, // replace with actual username
                password: API_PASSWORD  // replace with actual password
            },
            { httpsAgent: agent }
        );
        if (loginResponse.status !== 200) {
            throw new Error(`Login failed: ${loginResponse.statusText}`);
        }
        console.log('Login successful, token received');
        return loginResponse.data.token; // Assuming the token is in the response data
    } catch (error) {
        console.error('Login failed:', error.message);
        throw error;
    }
}

function cleanCityName(city) {
    return city
        .normalize("NFD") // split accents
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .trim()
        .replace(/\s+/g, " "); // fix extra spaces
}


async function getCityInfo(city) {
    try {
        // Wikipedia REST API (Summary endpoint)
        const cleanName = cleanCityName(city);
        const url = `${WIKIPEDIA_API_URL}/${encodeURIComponent(cleanName)}`;
        console.log(`Fetching city info for: ${cleanName}`, url);
        if (!city) {
            console.error('City name is required');
            return null;
        }
        const response = await axios.get(url, { httpsAgent: agent });

        if (response.status === 200 && !response.data.title.includes("Not found")) {
            console.log('✅ Valid city');
            console.log('Title:', response.data.title);
            console.log('Description:', response.data.description || 'No description available');
            // console.log('country:', response.data);

            let country = response.data.description.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g);
            if (country && country.length > 0) {
                country = country[country.length - 1]; // Get the last match                
            } else {
                country = "Country not found";
            }

            console.log('Country:', country);

            return {
                name: response.data.title,
                description: response.data.description || 'No description available',
                country: country || 'Country not found',
            };

        } else if (response.status === 404) {
            console.log('❌ City not found on Wikipedia');
            return;
        } else {
            console.log('❌ Invalid city');
            return;
        }
    } catch (error) {
        console.error('Error fetching city info:', error.message);
    }
}


app.post('/pollution-data', async (req, res) => {
    try {
        console.log('Received request to fetch pollution data', req.body);
        const token = await getToken();
        const { country, page, limit } = req.body;

        if (!country || typeof country !== 'string' || country.length !== 2) {
            return res.status(400).json({ error: 'Invalid country code (must be 2 letters)' });
        }
        if (!Number.isInteger(page) || page <= 0) {
            return res.status(400).json({ error: 'Page must be a positive integer' });
        }
        if (!Number.isInteger(limit) || limit <= 0 || limit > 51) {
            return res.status(400).json({ error: 'Limit must be a positive integer and not more than 50' });
        }
        const data = await getPollutionData(token, country, page, limit);
        console.log('Pollution data fetched successfully', data);
        let cities = [];
        for (const item of data.results) {
            let cityresInfo = await getCityInfo(item.name.trim());
            if (cityresInfo) {
                cities.push({
                    name: item.name.trim(),
                    country: cityresInfo.country,
                    pollution: item.pollution,
                    description: cityresInfo.description,
                })
            }
            console.log(`City: ${item.name.trim()} | Pollution: ${item.pollution} | ${item.name.trim()} City Info: Not Available `);
        }
        console.log('Cities with valid info:', cities.length);
        res.json({
            page,
            limit,
            total: cities.length,
            cities,
        });
    } catch (error) {
        console.error('Error in API:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});


// (async () => {
//     try {
//         const token = await getToken();
//         await getPollutionData(token);
//     } catch (error) {
//         console.error('Process failed:', error.message);
//     }
// })();