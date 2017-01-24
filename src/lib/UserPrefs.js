import { debounce } from 'lib/util';

export default function UserPrefs(nodeName, defaultSettings={}) {
    const loaded = false;
    let data = null;

    return Object.freeze({
        get,
        set
    });

    function get(key) {
        if (!loaded) data = localStorage.getItem(nodeName) || defaultSettings;
        return data[key];
    }

    function set(key, value) {
        data[key] = value;
        debounce(()=>localStorage.setItem(nodeName, data), 100);
    }
}