export class User {
    id: number = 0;
    firstName: string = '';
    lastName: string = '';
    email: string = '';
    age?: number;
    phoneNumber?: string;
    website?: string;
    address: string = '';
    isActive: boolean = true;
    dateOfBirth: Date = new Date();
    salary?: number;
    password: string = '';
    confirmPassword: string = '';
    username: string = '';
    zipCode?: string;
    country: string = '';
}