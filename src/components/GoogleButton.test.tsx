import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GoogleButton } from './GoogleButton';

describe('GoogleButton', () => {
  it('renders correctly in login mode', () => {
    render(<GoogleButton onClick={() => {}} loading={false} mode="login" />);
    expect(screen.getByText(/Masuk dengan Google/i)).toBeInTheDocument();
  });

  it('renders correctly in register mode', () => {
    render(<GoogleButton onClick={() => {}} loading={false} mode="register" />);
    expect(screen.getByText(/Daftar dengan Google/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<GoogleButton onClick={() => {}} loading={true} mode="login" />);
    expect(screen.getByText(/Menghubungkan ke Google/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} loading={false} mode="login" />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    const onClick = vi.fn();
    render(<GoogleButton onClick={onClick} loading={true} mode="login" />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
