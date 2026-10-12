import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AIReport from './AIReport';
import AIResponseDisplay from './AIResponseDisplay';
import AIWorkspace, { workspaceFields, workspacePresets } from './AIWorkspace';
import Login from '../pages/Login';
import FocusBoostRecommend from '../pages/FocusBoostRecommend';
import GoalProgressPredict from '../pages/GoalProgressPredict';
import { login } from '../services/api';

jest.mock('../services/api', () => ({ login: jest.fn(), register: jest.fn() }));

test('every workspace preset fills required and optional fields', () => {
  const presets = workspacePresets({ title: 'Planning', samples: [] });
  expect(presets).toHaveLength(3);
  for (const preset of presets) {
    expect(Object.keys(preset.values).sort()).toEqual(workspaceFields.map(field => field.key).sort());
    for (const field of workspaceFields) expect(preset.values[field.key]).toBeTruthy();
  }
});

test('returned and saved structured output renders facts, lists, tables, and falsy values', () => {
  const result = { facts: { enabled: false, count: 0, note: '' }, entries: [{ name: 'First', score: 0 }, { name: 'Second', score: 2 }], items: ['A', 'B'] };
  const returned = render(<AIResponseDisplay response={{ success: true, parsed: result }} />);
  expect(returned.getByText('Facts')).toBeInTheDocument();
  expect(returned.getByText('No')).toBeInTheDocument();
  expect(returned.getAllByText('0').length).toBeGreaterThan(0);
  expect(returned.getByText('Empty string')).toBeInTheDocument();
  expect(returned.container.querySelector('table')).toBeTruthy();
  returned.unmount();
  render(<AIReport response={{ id: 1, result_json: result, result: JSON.stringify(result), input: {} }} title="Saved report" />);
  expect(screen.getByText('Facts')).toBeInTheDocument();
  expect(screen.getByText('Empty string')).toBeInTheDocument();
  expect(screen.getByText('Second')).toBeInTheDocument();
});

test('demo button only fills fields when configured and never calls login', () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  process.env.REACT_APP_DEMO_EMAIL = 'fixture@example.invalid';
  process.env.REACT_APP_DEMO_PASSWORD = Array(12).fill('x').join('');
  try {
    render(<MemoryRouter><Login setUser={jest.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Fill demo credentials' }));
    expect(screen.getByLabelText('Email').value).toBe(process.env.REACT_APP_DEMO_EMAIL);
    expect(screen.getByPlaceholderText('Enter your password').value).toBe(process.env.REACT_APP_DEMO_PASSWORD);
    expect(login).not.toHaveBeenCalled();
  } finally {
    if (previousEmail === undefined) delete process.env.REACT_APP_DEMO_EMAIL;
    else process.env.REACT_APP_DEMO_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.REACT_APP_DEMO_PASSWORD;
    else process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
  }
});

test('login states when browser demo credentials are unavailable', () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  delete process.env.REACT_APP_DEMO_EMAIL;
  delete process.env.REACT_APP_DEMO_PASSWORD;
  try {
    render(<MemoryRouter><Login setUser={jest.fn()} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Fill demo credentials' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Demo credentials are not configured');
  } finally {
    if (previousEmail !== undefined) process.env.REACT_APP_DEMO_EMAIL = previousEmail;
    if (previousPassword !== undefined) process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
  }
});

test('native focus presets fill optional fields without generating', () => {
  const request = jest.spyOn(global, 'fetch').mockImplementation(() => { throw new Error('Unexpected request'); });
  try {
    render(<FocusBoostRecommend />);
    fireEvent.click(screen.getByRole('button', { name: 'Fill all fields · Quick review' }));
    const form = screen.getByRole('button', { name: 'Get Boosts' }).closest('form');
    const [task, energy, time] = form.querySelectorAll('input,select');
    expect(task.value).toBeTruthy();
    expect(energy.value).toBeTruthy();
    expect(time.value).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  } finally { request.mockRestore(); }
});

test('goal preset preserves an existing reference and leaves a missing one explicit', () => {
  const request = jest.spyOn(global, 'fetch').mockImplementation(() => { throw new Error('Unexpected request'); });
  try {
    const page = render(<GoalProgressPredict />);
    const reference = screen.getByPlaceholderText('e.g., 12');
    fireEvent.click(screen.getByRole('button', { name: 'Fill all fields · Quick review' }));
    expect(reference.value).toBe('');
    expect(screen.getByRole('status').textContent).toMatch(/actual source reference/i);
    fireEvent.change(reference, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fill all fields · Planning scenario' }));
    expect(reference.value).toBe('123');
    expect(request).not.toHaveBeenCalled();
    page.unmount();
  } finally { request.mockRestore(); }
});

test('saved history opens a readable detail report from a local fixture', async () => {
  const saved = { id: 17, feature: 'planning', input: { goal: 'Review priorities' }, created_at: '2026-10-10T12:00:00Z', model: 'fixture-model', result_json: { facts: { enabled: false, count: 0, note: '' }, recommendations: ['Review owner'] } };
  const request = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ items: [saved] }) });
  try {
    render(<AIWorkspace feature={{ id: 'planning', title: 'Planning', description: 'Fixture', samples: [] }} token="fixture-token" />);
    const row = await screen.findByRole('button', { name: /Review priorities/ });
    fireEvent.click(row);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Facts')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Empty string')).toBeInTheDocument();
    expect(screen.getByText('Review owner')).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  } finally { request.mockRestore(); }
});
