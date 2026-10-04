const HOST = "https://api.green-api.com";

const base = ({ idInstance, apiTokenInstance }, method) =>
  `${HOST}/waInstance${idInstance}/${method}/${apiTokenInstance}`;

// "+7 (900) 123-45-67" -> "79001234567@c.us"
export const toChatId = (phone) => `${phone.replace(/\D/g, "")}@c.us`;

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`GREEN-API error ${res.status}`);
  return res.status === 204 ? null : res.json();
}

// Credentials check: instance must be authorized
export async function getState(creds) {
  const data = await request(base(creds, "getStateInstance"));
  return data.stateInstance; // 'authorized' | 'notAuthorized' | ...
}

// https://green-api.com/v3/docs/api/sending/SendMessage/
export function sendMessage(creds, chatId, message) {
  return request(base(creds, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  }); // -> { idMessage }
}

// https://green-api.com/v3/docs/api/receiving/technology-http-api/
export async function receiveNotification(creds) {
  return request(`${base(creds, "receiveNotification")}?receiveTimeout=5`); // null if queue is empty
}

export function deleteNotification(creds, receiptId) {
  return request(
    `${HOST}/waInstance${creds.idInstance}/deleteNotification/${creds.apiTokenInstance}/${receiptId}`,
    { method: "DELETE" },
  );
}
