import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://kit.svelte.dev/docs/integrations#preprocessors
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
        // If your environment is not supported or you settled on a specific environment, switch out the adapter.
        // See https://kit.svelte.dev/docs/adapters for more information about adapters.
        adapter: adapter({
            // default options are fine initially
            pages: 'build', // Директория для сборки (по умолчанию)
            assets: 'build', // Директория для ассетов (по умолчанию)
            fallback: 'index.html', // Важно для SPA-режима в Capacitor
            precompress: false, // Сжатие не нужно, Capacitor сам справится
            strict: true
        }),
        // Если у тебя в проекте будут динамические маршруты,
        // и ты хочешь чтобы они работали как SPA,
        // возможно понадобится дополнительная конфигурация
        // или использование fallback страницы.
        // Для начала можешь попробовать без этого.
    }
};

export default config;