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
* postgres - База данных для Nextcloud и OnlyOffice
* redis Кэш и хранение контекста для бота
* nextcloud Основной веб‑интерфейс Nextcloud
* worker - Фоновые задачи (cron, AI‑помощник)
* bot Чат‑бот для Nextcloud Talk (интеграция с Redis и Yandex GPT)
* onlyoffice - Онлайн‑редактор документов
* coturn - STUN/TURN‑сервер для видеозвонков

## Приложения и функционал Nextcloud
* Регистрация и аутентификация:
    * Регистрация через электронную почту.
    * Подтверждение по ссылке с одноразовым кодом.
    * Сброс пароля через email.
* Базовые возможности:
    * Личное облако (файлы, папки).
    * Совместная работа с офисными документами (через OnlyOffice).
    * Просмотр PDF, аудиоплеер.
    * Календарь и события.
    * Игра Doom прямо в браузере (как Easter egg).
    * Nextcloud Talk:
        * Текстовый чат.
        * Видеозвонки (с использованием Coturn для NAT‑траверсала).
        * Интеграция с чат‑ботом.
* AI‑помощник:
    * Работает через API‑модель Mistral.
    * Выполняет фоновые задачи через контейнер worker.
* Чат‑бот в Nextcloud Talk:
    * Добавляется в любой чат.
    * Сохраняет контекст диалога (до 10 последних сообщений).
    * Поддерживает команду /reset для очистки контекста.
    * Отвечает на сообщения, используя Yandex GPT.

## Скриншоты
![Home](https://github.com/yarkozloff/nextcloud/blob/main/img/image1.png)
![Talk](https://github.com/yarkozloff/nextcloud/blob/main/img/image2.png)
![Files](https://github.com/yarkozloff/nextcloud/blob/main/img/image3.png)
![Office](https://github.com/yarkozloff/nextcloud/blob/main/img/image4.png)
![Photo](https://github.com/yarkozloff/nextcloud/blob/main/img/image5.png)
![Calendar](https://github.com/yarkozloff/nextcloud/blob/main/img/image6.png)
![Doom](https://github.com/yarkozloff/nextcloud/blob/main/img/image7.png)
![VideoCall](https://github.com/yarkozloff/nextcloud/blob/main/img/image8.png)