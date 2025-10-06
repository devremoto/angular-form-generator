// Test script to verify the enhanced model parser logic
import { ModelParser } from './src/generator/model-parser';

async function testModelParser() {
    const parser = new ModelParser();
    const model = parser.parseModelFromFile('./example-test-model.ts', 'TestModel');

    if (model) {
        console.log('Model parsing test results:');
        console.log('===========================');

        model.properties.forEach(prop => {
            console.log(`${prop.name}:`);
            console.log(`  Type: ${prop.type}`);
            console.log(`  Optional: ${prop.isOptional}`);
            console.log(`  Initial Value: ${prop.initialValue || 'none'}`);
            console.log(`  Array: ${prop.isArray}`);
            console.log('---');
        });
    } else {
        console.log('Failed to parse model');
    }
}

testModelParser().catch(console.error);