// Get existing project IDs from database
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabaseUrl = "https://spmtwsxrnclkxmqwsxdf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c";

const supabase = createClient(supabaseUrl, supabaseKey);

async function getProjectIds() {
    try {
        console.log('Fetching project IDs from database...');
        
        const { data: projects, error } = await supabase
            .from('projects')
            .select('id, project_name');
        
        if (error) throw error;
        
        // Read existing import_maps.json
        const importMaps = JSON.parse(readFileSync('import_maps.json', 'utf8'));
        
        // Add project IDs to the map
        const projectMap = {};
        projects.forEach(project => {
            projectMap[project.project_name] = project.id;
        });
        
        // Update import maps
        importMaps.projects = projectMap;
        importMaps.timestamp = new Date().toISOString();
        
        // Save updated import maps
        writeFileSync('import_maps.json', JSON.stringify(importMaps, null, 2));
        
        console.log(`✓ Found ${projects.length} projects:`);
        projects.forEach(project => {
            console.log(`  - ${project.project_name}`);
        });
        
        console.log('\n✓ Updated import_maps.json with project IDs');
        
    } catch (error) {
        console.error('Error fetching project IDs:', error);
        process.exit(1);
    }
}

getProjectIds();