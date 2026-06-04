import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/styles/global.css';

createApp(App).use(createPinia()).mount('#app');
