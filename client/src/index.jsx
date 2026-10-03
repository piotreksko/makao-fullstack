import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './rootReducer';
import { setUnauthorizedHandler } from './services/apiClient';
import { setUnauthorizedHandler as setSocketUnauthorizedHandler } from './services/socket';
import { sessionExpired } from './actions/authActions';

import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

setUnauthorizedHandler(() => store.dispatch(sessionExpired()));
setSocketUnauthorizedHandler(() => store.dispatch(sessionExpired()));

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
registerServiceWorker();
