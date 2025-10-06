// Example TypeScript models for testing the Angular Form Generator extension

export interface User {
    id?: number;
    name: string;
    email: string;
    age: number;
    isActive: boolean;
    createdAt?: Date;
    phoneNumber?: string;
    website?: string;
    bio?: string;
}

export class Product {
    id?: number;
    title: string = '';
    description: string = '';
    price: number = 0;
    inStock: boolean = true;
    category: string = '';
    tags: string[] = [];
    launchDate?: Date;
    imageUrl?: string;
    rating?: number;

    constructor(data?: Partial<Product>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export interface BlogPost {
    id?: string;
    title: string;
    content: string;
    author: string;
    published: boolean;
    publishedAt?: Date;
    tags: string[];
    viewCount: number;
    featuredImage?: string;
    excerpt?: string;
}

// Example of a more complex model for testing advanced features
export interface CustomerOrder {
    orderId?: string;
    customerName: string;
    customerEmail: string;
    orderDate: Date;
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    items: OrderItem[];
    paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer';
    discountApplied?: number;
    notes?: string;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}