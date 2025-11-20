import { POST } from "../../src/app/api/chat/route";
import { NextRequest } from "next/server";
import { expect, test } from "vitest";

async function streamToString(stream: ReadableStream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

test("Gemini Task Manager API returns streamed response", async () => {
  const body = {
    message: "Add a task to study biology at 5pm tomorrow",
    chatHistory: []
  };

  const req = new NextRequest("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  });

  const res = await POST(req);
  const text = await streamToString(res.body!);

  console.log("\n--- Stream Output ---\n", text);

  expect(text).toContain("data:");
  expect(text).toContain(`"type":"text"`);
});


// test("test edit", async () => {
//   const body = {
//     message: "edit the task to study chemistry at 6pm tomorrow",
//     chatHistory: []
//   };

//   const req = new NextRequest("http://localhost", {
//     method: "POST",
//     body: JSON.stringify(body),
//     headers: { "Content-Type": "application/json" }
//   });

//   const res = await POST(req);
//   const text = await streamToString(res.body!);

//   console.log("\n--- Stream Output ---\n", text);

//   expect(text).toContain("data:");
//   expect(text).toContain(`"type":"text"`);
// });


// test("Gemini Task Manager API handles remove task", async () => {
//   const body = {
//     message: "remove the task to study biology",
//     chatHistory: []
//   };

//   const req = new NextRequest("http://localhost", {
//     method: "POST",
//     body: JSON.stringify(body),
//     headers: { "Content-Type": "application/json" }
//   });

//   const res = await POST(req);
//   const text = await streamToString(res.body!);

//   console.log("\n--- Stream Output (Remove Task) ---\n", text);

//   expect(text).toContain("data:");
//   expect(text).toContain(`"type":"text"`);
// });


// test("Gemini Task Manager API handles find tasks", async () => {
//   const body = {
//     message: "find tasks related to studying",
//     chatHistory: []
//   };

//   const req = new NextRequest("http://localhost", {
//     method: "POST",
//     body: JSON.stringify(body),
//     headers: { "Content-Type": "application/json" }
//   });

//   const res = await POST(req);
//   const text = await streamToString(res.body!);

//   console.log("\n--- Stream Output (Find Tasks) ---\n", text);

//   expect(text).toContain("data:");
//   expect(text).toContain(`"type":"text"`);
// });
