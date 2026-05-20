export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  balance: number;
  points: number;
  coupons: number;
}

export interface Order {
  id: string;
  productName: string;
  productImage: string;
  price: number;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}
