# WhatsApp-чат на GREEN-API (React)

## Запуск

Проект задеплоен на https://whatsapp-chat-green-api.vercel.app/

## Локальный запуск

npm install

npm run dev

## Перед использованием

1. Создайте инстанс на https://console.green-api.com и отсканируйте QR-код с помощью WhatsApp (состояние должно быть authorized).

2. Откройте приложение и введите idInstance и apiTokenInstance.

3. Введите номер получателя с кодом страны (например, 79001234567) и нажмите **Новый чат**.

4. Отправьте сообщение; ответы из WhatsApp появятся в чате через несколько секунд.

## Как это работает

sendMessage — POST-запрос к /waInstance{id}/sendMessage/{token} с параметрами {chatId, message}.
Входящие сообщения — приложение выполняет long polling метода receiveNotification, обрабатывает incomingMessageReceived (а также outgoingMessageReceived для сообщений, отправленных с телефона), а затем вызывает deleteNotification для каждого receiptId.
Учётные данные и история чатов хранятся в localStorage (история локальная; HTTP API не загружает предыдущую историю автоматически).

## Примечания

Очередь уведомлений является общей: не выполняйте опрос одного и того же инстанса одновременно из другого приложения.
Для того, чтобы видеть входящие сообщения в https://console.green-api.com в настройках инстанса нужно включить уведомления о входящих сообщениях
