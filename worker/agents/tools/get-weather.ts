import { tool } from "ai";
import { z } from "zod";

type CityLocationType = { latitude: number; longitude: number };

function isChineseCityName(city: string): boolean {
  return /[\u3400-\u9fff]/u.test(city);
}

async function geocodeCity(city: string): Promise<CityLocationType | null> {
  const normalizedCity = city
    .trim()
    .replace(/[\s\u3000]+/gu, " ")
    .replace(/(?:市|县|區|区)$/u, "");
  const language = isChineseCityName(normalizedCity) ? "zh" : "en";

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedCity)}&count=1&language=${language}&format=json`,
    );

    if (!response.ok) {
      return null;
    }

    const data: { results: CityLocationType[] } = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch {
    return null;
  }
}

export const getWeather = tool({
  description:
    "Get the current weather at a location. You can provide either coordinates or a city name.",
  inputSchema: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z
      .string()
      .describe(
        "City name in the user's language, including Chinese names such as 南昌, 北京, or 上海",
      )
      .optional(),
  }),
  execute: async (input) => {
    let latitude: number;
    let longitude: number;

    if (input.city) {
      const coords = await geocodeCity(input.city);
      if (!coords) {
        return {
          error: `Could not find coordinates for "${input.city}". Please check the city name.`,
        };
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else if (input.latitude !== undefined && input.longitude !== undefined) {
      latitude = input.latitude;
      longitude = input.longitude;
    } else {
      return {
        error:
          "Please provide either a city name or both latitude and longitude coordinates.",
      };
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
    );

    const weatherData: any = await response.json();

    if ("city" in input) {
      weatherData.cityName = input.city;
    }

    return weatherData;
  },
});
