import * as FileSystem from "expo-file-system";
import { initLlama } from "llama.rn";
import { useRef, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import "react-native-reanimated";

const Models = [
  // GOOD, FAST, all languages. avg. time 9s
  {
    name: "Phi-3.5-mini-instruct.Q8_0",
    url: "https://huggingface.co/MaziyarPanahi/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct.Q8_0.gguf",
    localPath: FileSystem.documentDirectory + "Phi-3.5-mini-instruct-Q8_0.gguf",
  },
  // GOOD avg. time 9s. If language cause issues refine the prompt with an example. (BEST SOLUTION)
  {
    name: "Phi-4-mini-instruct.Q8_0",
    url: "https://magicplan-test.s3.eu-central-1.amazonaws.com/Phi-4-mini-instruct.gguf",
    localPath: FileSystem.documentDirectory + "Phi-4-mini-instruct-Q8_0.gguf",
  },
  // GOOD, FAST but error with language sometimes
  // Good but still worst than Phi-4 and LLama-3.2
  {
    name: "Qwen2.5-1.5B-Instruct (Q8_0)",
    url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q8_0.gguf",
    localPath: FileSystem.documentDirectory + "qwen2.5-1.5b-instruct-q8_0.gguf",
  },
  // GOOD, FAST with all languages. avg. time 9s
  // Good response, but better the Phi-4
  {
    // https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF
    name: "Llama-3.2-3B-Instruct (Q8_0)",
    url: "https://huggingface.co/QuantFactory/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct.Q8_0.gguf",
    localPath: FileSystem.documentDirectory + "llama-3.2-3b-instruct-q8_0.gguf",
  },
  // GOOD. avg. time 9s
  // Still worst than Phi-4 and LLama-3.2
  {
    name: "SmolLM3‑3B",
    url: "https://huggingface.co/ggml-org/SmolLM3-3B-GGUF/resolve/main/SmolLM3-Q8_0.gguf",
    localPath: FileSystem.documentDirectory + "smollm3-3b-q8_0.gguf",
  },
];

const EXAMPLES = require("./examples.json");

export default function RootLayout() {
  const [progress, setProgress] = useState(0);
  const [response, setResponse] = useState("");
  const [duration, setDuration] = useState("");

  const callback = (downloadProgress) => {
    const progress =
      downloadProgress.totalBytesWritten /
      downloadProgress.totalBytesExpectedToWrite;
    setProgress(progress);
  };

  const loadModel = async (model) => {
    const downloadResumable = FileSystem.createDownloadResumable(
      model.url,
      model.localPath,
      {},
      callback
    );

    console.log("Downloading model:", model.name);

    const fileDownloaded = await downloadResumable.downloadAsync();
  };

  const [context, setContext] = useState(useRef(null));

  const generate = async (userInput: string, model: any) => {
    const start = Date.now();

    setResponse("");

    const stopWords = [
      "</s>",
      "<|end|>",
      "<|eot_id|>",
      "<|end_of_text|>",
      "<|im_end|>",
      "<|EOT|>",
      "<|END_OF_TURN_TOKEN|>",
      "<|end_of_turn|>",
      "<|endoftext|>",
      "<end_of_turn>",
      "<|endoftext|>",
      "</s>",
    ];

    const msgResult = await context.completion({
      messages: [
        {
          role: "system",
          content: `
            Your task: Refine raw voice dictation into clear, professional, grammatically flawless text. Preserve original meaning, numbers, and language.

            Key Transformations:
            * Correct grammar, spelling, and punctuation.
            * Improve sentence structure and add paragraph breaks.
            * Format dictated lists (bullets/numbers).
            * Ensure consistent capitalization.
            * Add descriptive headings when indicated.

            Deliver only the refined text, no commentary. Do not add information, distort meaning, over-correct, or change the original language.

            **Example:**

            **Raw Voice Dictation:** "Ich bin müde heute, und ich muss noch viel arbeiten. Drei sachen zu tun: erstens, e-mail senden; zweitens, den bericht schreiben; und drittens, die präsentation vorbereiten. Es ist halb zwei nachmittags."

            **Refined Text:**
            Ich bin heute müde, und ich muss noch viel arbeiten. Drei Sachen sind zu tun:
            * Erstens, E-Mails senden.
            * Zweitens, den Bericht schreiben.
            * Drittens, die Präsentation vorbereiten.

            Es ist halb zwei nachmittags.
          `,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      n_predict: 300,
      stop: stopWords,
      temperature: 0.01,
      min_p: 0.1,
      top_k: 40,
      top_p: 0.95,
      typical_p: 0.5,
    });

    const end = Date.now();
    const durationSeconds = ((end - start) / 1000).toFixed(2);
    setDuration(durationSeconds);

    console.log(msgResult);
    setResponse(msgResult.text);
  };

  const generateInLoop = async (userInputs: string[], model: any) => {
    const allResponses = [];

    const context = await initLlama({
      model: model.localPath,
      n_threads: 4,
      n_gpu_layers: 50,
      // use_mmap: true,
      // n_ctx: 1024,
      // n_batch: 512,
      // n_ubatch: 512,
      // cache_type_k: "q8_0",
      // cache_type_v: "q8_0",
    });

    const stopWords = [
      "</s>",
      "<|end|>",
      "<|eot_id|>",
      "<|end_of_text|>",
      "<|im_end|>",
      "<|EOT|>",
      "<|END_OF_TURN_TOKEN|>",
      "<|end_of_turn|>",
      "<|endoftext|>",
      "<end_of_turn>",
      "<|endoftext|>",
      "</s>",
    ];

    for (const userInput of userInputs) {
      console.log("Processing input:", userInput);

      const msgResult = await context.completion({
        messages: [
          {
            role: "system",
            content: `
            Your task: Refine raw voice dictation into clear, professional, grammatically flawless text. Preserve original meaning, numbers, and language.

            Key Transformations:
            * Correct grammar, spelling, and punctuation.
            * Improve sentence structure and add paragraph breaks.
            * Format dictated lists (bullets/numbers).
            * Ensure consistent capitalization.
            * Add descriptive headings when indicated.

            Deliver only the refined text, no commentary. Do not add information, distort meaning, over-correct, or change the original language.

            **Example:**

            **Raw Voice Dictation:** "Ich bin müde heute, und ich muss noch viel arbeiten. Drei sachen zu tun: erstens, e-mail senden; zweitens, den bericht schreiben; und drittens, die präsentation vorbereiten. Es ist halb zwei nachmittags."

            **Refined Text:**
            Ich bin heute müde, und ich muss noch viel arbeiten. Drei Sachen sind zu tun:
            * Erstens, E-Mails senden.
            * Zweitens, den Bericht schreiben.
            * Drittens, die Präsentation vorbereiten.

            Es ist halb zwei nachmittags.
          `,
          },
          {
            role: "user",
            content: userInput,
          },
        ],
        n_predict: 300,
        stop: stopWords,
        temperature: 0.01,
        min_p: 0.1,
        top_k: 40,
        top_p: 0.95,
        typical_p: 0.5,
      });

      allResponses.push({
        old: userInput,
        new: msgResult.text,
      });
    }

    return allResponses;
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
      }}
    >
      <Button
        title="Load Model"
        onPress={() => {
          loadModel(Models[1]);
        }}
      />

      <Button
        title="Load context"
        onPress={async () => {
          const context = await initLlama({
            model:
              FileSystem.documentDirectory + "Phi-4-mini-instruct-Q8_0.gguf",
            n_threads: 4,
            use_mlock: true,
            n_gpu_layers: 50,
            n_ctx: 1024,
            // use_mmap: true,
            // n_batch: 512,
            // n_ubatch: 512,
            // cache_type_k: "q8_0",
            // cache_type_v: "q8_0",
          });
          console.log("Context initialized:", context);
          setContext(context);
        }}
      />

      <Button
        title="Generate Response"
        onPress={async () => {
          // const responses = await generateInLoop(EXAMPLES, Models[1]);
          // console.log("Responses:", responses);
          await generate(EXAMPLES[8], Models[1]);
        }}
      />

      <Text style={{ fontSize: 20 }}>{progress}</Text>

      <View
        style={{
          height: 400,
          backgroundColor: "lightgray",
          width: "100%",
          padding: 10,
          marginTop: 20,
        }}
      >
        <ScrollView>
          <Text style={{ fontSize: 18 }}>{response}</Text>
        </ScrollView>
      </View>

      <Text>{duration}s</Text>
    </View>
  );
}
