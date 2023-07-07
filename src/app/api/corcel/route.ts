// app/api/image/route.js

import axios from "axios";

export async function POST(request: any) {
  try {
    const body = await request.json();

    console.log(body);

    const options = {
      method: "POST",
      url: "https://api.corcel.io/v1/image/cortext/text-to-image",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: "3ff413ba-70e0-4e3b-9de4-ec02b21525e1",
      },
      data: {
        messages: body.imagePromt,
        model: "cortext-image",
        size: "1024x1024",
        quality: "standard",
        provider: "OpenAI",
        steps: 30,
        cfg_scale: 8,
      },
    };

    const response = await axios.request(options);
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
