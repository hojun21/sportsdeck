import { InferenceClient } from "@huggingface/inference";
import { NextResponse } from "next/server";

const client = new InferenceClient(process.env.HF_TOKEN);

export async function POST(request: Request): Promise<NextResponse>{

    try {   

        const {text} = await request.json();
        
        if(!text || text.trim() === "") return NextResponse.json({error: "No text to translate."}, {status: 400});

        if(typeof text !== "string") return NextResponse.json({error: "Text must be a string"}, {status: 400});

        const response = await client.translation({
            model: "Helsinki-NLP/opus-mt-mul-en",
            inputs: text,
            provider: "hf-inference"
        })

        const translated_res = response.translation_text;

        if(!translated_res) return NextResponse.json({error: "Translation failed"}, {status: 500});

        return NextResponse.json({translated_res}, {status: 200});

    } catch(error){
        console.log(error);
        return NextResponse.json({error: "Unexpected Error has occured while translating text."}, {status: 500});
    }

}