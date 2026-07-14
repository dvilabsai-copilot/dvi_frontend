
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VendorsPage from '../pages/vendor/VendorsPage';
import { BrowserRouter } from 'react-router-dom';
import * as vendorService from '../services/vendors';

// Mock the vendor service
vi.mock('../services/vendors', () => ({
  listVendors: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Vendors Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vendors list', async () => {
    const mockVendors = {
      items: [
        {
          id: '1',
          name: 'Test Vendor',
          code: 'V001',
          mobile: '9876543210',
          email: 'test@vendor.com',
          totalBranch: 2,
          isActive: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    };
    (vendorService.listVendors as any).mockResolvedValue(mockVendors);

    render(
      <BrowserRouter>
        <VendorsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('V001')).toBeInTheDocument();
      expect(screen.getByText('9876543210')).toBeInTheDocument();
    });
  });

  it('navigates to create vendor page on button click', async () => {
    (vendorService.listVendors as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });

    render(
      <BrowserRouter>
        <VendorsPage />
      </BrowserRouter>
    );

    const addButton = screen.getByRole('button', { name: /Add Vendor/i });
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/vendor/new');
  });

  it('filters vendors on search input', async () => {
    (vendorService.listVendors as any).mockResolvedValue({
      items: [
        { id: '1', name: 'Test Vendor', code: 'V001', mobile: '9876543210', totalBranch: 1, isActive: true },
        { id: '2', name: 'Other Vendor', code: 'V002', mobile: '9876543211', totalBranch: 1, isActive: true },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });

    render(
      <BrowserRouter>
        <VendorsPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Search/i);
    await waitFor(() => expect(screen.getByText('Other Vendor')).toBeInTheDocument());
    fireEvent.change(searchInput, { target: { value: 'Test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.queryByText('Other Vendor')).not.toBeInTheDocument();
    });
  });
});
