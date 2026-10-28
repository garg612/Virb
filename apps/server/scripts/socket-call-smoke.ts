import { io } from "socket.io-client";

const BASE = "http://localhost:5000";

async function register(nameSuffix: string): Promise<any> {
  const res = await fetch(`${BASE}/api/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Test${nameSuffix}`,
      email: `test${nameSuffix}@example.com`,
      username: `test${nameSuffix}`,
      password: "Pass123!",
    }),
  });
  return res.json();
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  console.log("Registering users...");
  const A = await register("A" + Date.now());
  const B = await register("B" + Date.now());

  const idA = A.message.user.id;
  const idB = B.message.user.id;
  const tokenA = A.message.accessToken;
  const tokenB = B.message.accessToken;

  console.log("Users:", idA, idB);

  // create call via HTTP
  const startRes = await fetch(`${BASE}/api/calls/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ receiverId: idB, type: "audio" }),
  });
  const startJson = (await startRes.json()) as any;
  const callId = startJson.call.id;
  console.log("Call created", callId);

  // connect sockets
  const sockA = io(BASE);
  const sockB = io(BASE);

  sockA.on("connect", () => {
    console.log("A connected", sockA.id);
    sockA.emit("join", idA);
  });

  sockB.on("connect", () => {
    console.log("B connected", sockB.id);
    sockB.emit("join", idB);
  });

  sockB.on("incomingcall", async (data: any) => {
    console.log("B received incomingcall", data.callId, "from", data.callerInfo);
    // simulate answering
    await wait(500);
    sockB.emit("acceptcall", {
      callId: data.callId,
      answer: "fake-answer-sdp",
      answercallerId: data.callerInfo.id,
    });
  });

  sockA.on("callaccepted", (data: any) => {
    console.log("A received callaccepted", data.callId, data.answer);
  });

  sockA.on("callmissed", (data: any) => {
    console.log("A callmissed", data);
  });

  sockB.on("callended", (data: any) => {
    console.log("B callended", data);
  });

  // trigger calluser from A after both connected
  await wait(1000);
  console.log("A emits calluser");
  sockA.emit("calluser", {
    receiverId: idB,
    offer: "fake-offer-sdp",
    callerInfo: { id: idA },
    callId,
    type: "audio",
  });

  // wait then end call
  await wait(2000);
  console.log("A emits endcall");
  sockA.emit("endcall", { receiverId: idB, callId });

  await wait(1000);
  sockA.close();
  sockB.close();
  console.log("Done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
