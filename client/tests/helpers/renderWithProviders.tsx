import React from 'react';
import { render } from '@testing-library/react';
import { AllProviders } from './AllProviders';

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: AllProviders });
}
