export class TestModel {
    // Explicit types with question mark (optional)
    explicitOptionalString?: string;
    explicitOptionalNumber?: number;
    explicitOptionalBoolean?: boolean;

    // Definite assignment assertion (!) - treated as optional
    _id!: string;
    userId!: number;
    isAdmin!: boolean;
    createdAt!: Date;
    tags!: string[];

    // Explicit types without question mark (required)
    explicitRequiredString: string = 'required';
    explicitRequiredNumber: number = 1;
    explicitRequiredBoolean: boolean = true;

    // No explicit type, inferred from initial values
    // Empty/Default values = inferred type + optional
    inferredStringOptional = '';
    inferredStringOptional2 = "";
    inferredNumberOptional = 0;
    inferredBooleanOptional = true;         // Default boolean value = optional
    inferredBooleanOptional2 = false;      // Default boolean value = optional
    inferredDateOptional = new Date();     // Default date constructor = optional
    inferredObjectOptional = {};
    inferredArrayOptional = [];

    // Non-empty/Specific values = inferred type + required
    inferredStringRequired = 'default value';
    inferredStringRequired2 = "another value";
    inferredNumberRequired = 42;
    inferredNumberRequired2 = -5;
    inferredNumberRequired3 = 3.14;
    inferredDateRequired = new Date('2023-01-01');  // Specific date = required
    inferredObjectRequired = { key: 'value' };
    inferredArrayRequired = [1, 2, 3];
    inferredStringArrayRequired = ['a', 'b', 'c'];

    // Mixed scenarios
    explicitStringWithEmptyDefault: string = '';
    explicitNumberWithZeroDefault: number = 0;
    explicitBooleanWithFalseDefault: boolean = false;
}