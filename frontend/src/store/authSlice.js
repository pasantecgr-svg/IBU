import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: localStorage.getItem('ibu-token') || '',
  user: (() => {
    try {
      const raw = localStorage.getItem('ibu-user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),
  theme: localStorage.getItem('theme') || 'light'
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action) => {
      state.token = action.payload.token || '';
      state.user = action.payload.user || null;
      localStorage.setItem('ibu-token', state.token);
      if (state.user) {
        localStorage.setItem('ibu-user', JSON.stringify(state.user));
      } else {
        localStorage.removeItem('ibu-user');
      }
    },
    clearSession: (state) => {
      state.token = '';
      state.user = null;
      localStorage.removeItem('ibu-token');
      localStorage.removeItem('ibu-user');
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    }
  }
});

export const { setSession, clearSession, setTheme } = authSlice.actions;
export default authSlice.reducer;
