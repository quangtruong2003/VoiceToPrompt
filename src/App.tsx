import { OverlayView } from './components/OverlayView'
import { SettingsView } from './components/SettingsView'
import { HistoryView } from './components/HistoryView'
import './styles/index.css'

function App() {
    const hash = window.location.hash.replace('#', '')

    if (hash === 'settings') {
        return <SettingsView />
    }

    if (hash === 'history') {
        return <HistoryView />
    }

    return <OverlayView />
}

export default App
