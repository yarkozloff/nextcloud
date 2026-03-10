# Home Nextcloud Setup

## Project description
The project is a self‑hosted Nextcloud instance with extended functionality: integration of OnlyOffice for document editing, video calls via Nextcloud Talk + Coturn, an AI assistant based on Mistral, and a chatbot in Nextcloud Talk with context support via Yandex GPT.

## Architecture and network connectivity
A domain has been purchased from Reg.ru, and an SSL certificate has been issued there. A mail server is configured on Reg.ru. The domain name is linked to the public IP address of the Keenetic router. Port forwarding for all services is set up on the router:

* Nextcloud: port $8080$ (HTTP), port $443$ (HTTPS);
* OnlyOffice: port $8000$ (HTTP), port $8443$ (HTTPS);
* Coturn: port $3478$ (UDP/TCP), port $5349$ (TCP);
* Bot: port $3000$.

## Traffic routing logic
* An external request goes to the router’s public IP → port forwarding → Docker host → the corresponding container.
* Internal communication between containers takes place directly via the Docker network `nextcloud_network`.

## Containers and their purposes
* `postgres` — database for Nextcloud and OnlyOffice;
* `redis` — cache and context storage for the bot;
* `nextcloud` — main Nextcloud web interface;
* `worker` — background tasks (cron jobs, AI assistant);
* `bot` — chatbot for Nextcloud Talk (integrated with Redis and Yandex GPT);
* `onlyoffice` — online document editor;
* `coturn` — STUN/TURN server for video calls.

## Nextcloud apps and functionality

### Registration and authentication
* Registration via email.
* Verification via a link with a one‑time code.
* Password reset via email.

### Core features
* Personal cloud (files and folders).
* Collaborative editing of office documents (via OnlyOffice).
* PDF viewer and audio player.
* Calendar and events.
* Doom game directly in the browser (as an Easter egg).

### Nextcloud Talk
* Text chat.
* Video calls (using Coturn for NAT traversal).
* Integration with the chatbot.

### AI assistant
* Operates via the Mistral API model.
* Handles background tasks via the `worker` container.

### Chatbot in Nextcloud Talk
* Can be added to any chat.
* Stores conversation context (up to the last 10 messages).
* Supports the `/reset` command to clear the context.
* Replies to messages using Yandex GPT.

## Screenshots
![Home](https://github.com/yarkozloff/nextcloud/blob/main/img/image1.png)  
![Talk](https://github.com/yarkozloff/nextcloud/blob/main/img/image2.png)  
![Files](https://github.com/yarkozloff/nextcloud/blob/main/img/image3.png)  
![Office](https://github.com/yarkozloff/nextcloud/blob/main/img/image4.png)  
![Photo](https://github.com/yarkozloff/nextcloud/blob/main/img/image5.png)  
![Calendar](https://github.com/yarkozloff/nextcloud/blob/main/img/image6.png)  
![Doom](https://github.com/yarkozloff/nextcloud/blob/main/img/image7.png)  
![VideoCall](https://github.com/yarkozloff/nextcloud/blob/main/img/image8.png)
