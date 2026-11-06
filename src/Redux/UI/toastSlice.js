import { createSlice } from '@reduxjs/toolkit';

let nextId = 0;

const toastSlice = createSlice({
  name: 'toast',
  initialState: { queue: [] },
  reducers: {
    showToast: {
      reducer(state, action) {
        state.queue.push(action.payload);
      },
      prepare({ message, variant = 'info', duration = 4000 }) {
        return { payload: { id: ++nextId, message, variant, duration } };
      },
    },
    dismissToast(state, action) {
      state.queue = state.queue.filter(t => t.id !== action.payload);
    },
  },
});

export const { showToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;
