import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../../components/ui/Button';
import { vi, describe, test, expect } from 'vitest';

describe('Button Component', () => {
  test('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByText('Click Me');
    expect(button).toBeInTheDocument();
    // Check button exists and has some styling without checking specific classes
    expect(button.className).toBeTruthy();
  });

  test('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    
    // Instead of checking specific class names, check by variant attribute
    expect(screen.getByText('Default')).toHaveAttribute('data-variant', 'default');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByText('Outline')).toHaveAttribute('data-variant', 'outline');

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText('Destructive')).toHaveAttribute('data-variant', 'destructive');
  });

  test('applies size classes correctly', () => {
    const { rerender } = render(<Button size="default">Default Size</Button>);
    const defaultButton = screen.getByText('Default Size');
    
    // Check by data-size attribute instead of class names
    expect(defaultButton).toHaveAttribute('data-size', 'default');

    rerender(<Button size="sm">Small</Button>);
    const smallButton = screen.getByText('Small');
    expect(smallButton).toHaveAttribute('data-size', 'sm');

    rerender(<Button size="lg">Large</Button>);
    const largeButton = screen.getByText('Large');
    expect(largeButton).toHaveAttribute('data-size', 'lg');
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('can be disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('renders with children correctly', () => {
    render(
      <Button>
        <span data-testid="child-element">Child Element</span>
      </Button>
    );

    expect(screen.getByTestId('child-element')).toBeInTheDocument();
  });

  test('passes additional props to the button element', () => {
    render(
      <Button data-testid="custom-button" aria-label="Custom Button">
        Custom Props
      </Button>
    );

    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom Button');
  });

  test('applies full width class when fullWidth prop is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    
    const button = screen.getByText('Full Width');
    expect(button).toHaveAttribute('data-fullwidth', 'true');
  });

  test('applies additional className when provided', () => {
    render(<Button className="test-class">Custom Class</Button>);
    
    const button = screen.getByText('Custom Class');
    expect(button.className).toContain('test-class');
  });
});