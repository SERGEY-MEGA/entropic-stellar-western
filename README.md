# Вестерн Дуэль - Western Duel

**3D Шутер от первого лица в сеттинге Дикого Запада**
*Проект для Хакатона | Hackathon Project*

![Game Screenshot](screenshot.png) <!-- (Optional: Add a screenshot later) -->

## Запуск Онлайн (One-Click)
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/SERGEY-MEGA/entropic-stellar-western)
[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=for-the-badge&logo=codesandbox)](https://codesandbox.io/s/github/SERGEY-MEGA/entropic-stellar-western)


## О Проекте
Стилизованный FPS, созданный с использованием **Three.js** и **Cannon.js**. Игрок выступает в роли шерифа, зачищающего каньон от бандитов.

## Ключевые Особенности
- **Атмосфера**: "Золотой Час" (закат), объемный туман, процедурное окружение.
- **Геймплей**: Реалистичная баллистика, отдача, перезарядка револьверов.
- **Враги**: Умные бандиты и эпичные Боссы с увеличенным здоровьем.
- **Вампиризм**: Лечение за убийства (+5 HP) и попадания (+1 HP).
- **Аудио**: Полностью синтезированный звук (Web Audio API) без внешних файлов.
- **Диалоги**: Система радиоперехвата с возможностью отвечать врагам (1-3).
- **Интерфейс**: Полная локализация на русский язык.

## Управление
| Клавиша | Действие |
|---|---|
| **WASD** | Движение |
| **SPACE** | Прыжок |
| **LMB (ЛКМ)** | Стрельба |
| **R** | Перезарядка |
| **G** | Магазин (Аптечки/Патроны) |
| **T** | Рация (Вкл/Выкл диалоги) |
| **1, 2, 3** | Выбор ответа в диалоге |
| **M** | Миникарта |

## Запуск Проекта
1.  Клонируйте репозиторий.
2.  Установите зависимости: `npm install`
3.  Запустите сервер: `npm run dev`

## Технологии
- [Three.js](https://threejs.org/) - 3D Рендеринг
- [Cannon-es](https://github.com/pmndrs/cannon-es) - Физика
- [Vite](https://vitejs.dev/) - Сборка и Dev Server
