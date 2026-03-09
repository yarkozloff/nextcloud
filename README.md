# Домашний Nextcloud
## Описание проекта
Проект представляет собой развёрнутый домашний Nextcloud с расширенным функционалом: интеграция OnlyOffice для работы с документами, видеозвонки через Nextcloud Talk + Coturn, AI‑ассистент на базе Mistral и чат‑бот в Nextcloud Talk с поддержкой контекста на Yandex GPT.

## Архитектура и сетевая связанность
Домен приобретён на Reg.ru, там же выпущен SSL‑сертификат.
На Reg.ru настроен почтовый сервер.
Доменное имя привязано к белому IP‑адресу роутера Keenetic.
На роутере выполнен проброс портов для всех сервисов:
* Nextcloud: 8080 (HTTP), 443 (HTTPS);
* OnlyOffice: 8000 (HTTP), 8443 (HTTPS);
* Coturn: 3478 (UDP/TCP), 5349 (TCP);
* Бот: 3000

## Логика маршрутизации трафика
* Внешний запрос → белый IP роутера → проброс порта → Docker‑хост → соответствующий контейнер.
* Внутренняя коммуникация между контейнерами происходит напрямую через Docker‑сеть nextcloud_network.

## Контейнеры и их назначение
| Контейнер | Назначение | Ключевые параметры
| --- | --- |
|postgres | База данных для Nextcloud и OnlyOffice | Образ: postgres:16, объём: ./postgres_data, ресурсы: 2 CPU, 4 GB RAM |
redis | Кэш и хранение контекста для бота	| Образ: redis:7-alpine, объём: ./redis_data |
nextcloud | Основной веб‑интерфейс Nextcloud	| Образ: nextcloud:latest, порты: 8080:80, 443:443, ресурсы: 2 CPU, 6 GB RAM, SSL‑настройки |
worker | Фоновые задачи (cron, AI‑помощник)	| Образ: nextcloud:latest, объём: ./nextcloud_data, ресурсы: 1 CPU, 1 GB RAM |
bot | Чат‑бот для Nextcloud Talk	| Образ: nextcloud-ai-bot:latest, порт: 3000:3000, интеграция с Redis и Yandex GPT |
onlyoffice | Онлайн‑редактор документов	| Образ: onlyoffice/documentserver:latest, порты: 8000:80, 8443:443, связь с PostgreSQL и Redis |
coturn | STUN/TURN‑сервер для видеозвонков	| Образ: instrumentisto/coturn:latest, порты: 3478/udp, 3478/tcp, 5349/tcp |
