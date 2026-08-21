import { Router } from 'express';
import { db } from '../db';
import { Department, Location } from '../../src/types/index';

const router = Router();

// Departments
router.get('/departments', (req, res) => {
  const data = db.get();
  const depts = data.departments.map(d => {
    const count = data.devices.filter(dev => dev.departmentId === d.id).length;
    return { ...d, deviceCount: count };
  });
  return res.json(depts);
});

router.post('/departments', (req, res) => {
  const { name, code, description, headName, email } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Department name and code are required.' });
  }

  const data = db.get();
  const newDept: Department = {
    id: `dept-${Date.now()}`,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    description: (description || '').trim(),
    headName: (headName || '').trim(),
    email: (email || '').trim(),
    createdAt: new Date().toISOString()
  };

  data.departments.push(newDept);
  db.scheduleSave();
  return res.status(201).json(newDept);
});

router.put('/departments/:id', (req, res) => {
  const data = db.get();
  const dept = data.departments.find(d => d.id === req.params.id);
  if (!dept) {
    return res.status(404).json({ error: 'Department not found.' });
  }

  const { name, code, description, headName, email } = req.body;
  if (name) dept.name = name.trim();
  if (code) dept.code = code.trim().toUpperCase();
  if (description !== undefined) dept.description = description.trim();
  if (headName !== undefined) dept.headName = headName.trim();
  if (email !== undefined) dept.email = email.trim();

  db.scheduleSave();
  return res.json(dept);
});

router.delete('/departments/:id', (req, res) => {
  const data = db.get();
  const index = data.departments.findIndex(d => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Department not found.' });
  }
  data.departments.splice(index, 1);
  db.scheduleSave();
  return res.json({ success: true });
});

// Locations
router.get('/locations', (req, res) => {
  const data = db.get();
  const locs = data.locations.map(l => {
    const count = data.devices.filter(dev => dev.locationId === l.id).length;
    return { ...l, deviceCount: count };
  });
  return res.json(locs);
});

router.post('/locations', (req, res) => {
  const { name, type, building, floor, roomNumber, departmentId, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Location name is required.' });
  }

  const data = db.get();
  const newLoc: Location = {
    id: `loc-${Date.now()}`,
    name: name.trim(),
    type: type || 'Laboratory',
    building: (building || 'Main Building').trim(),
    floor: (floor || '1st Floor').trim(),
    roomNumber: (roomNumber || '').trim(),
    departmentId,
    description: (description || '').trim(),
    createdAt: new Date().toISOString()
  };

  data.locations.push(newLoc);
  db.scheduleSave();
  return res.status(201).json(newLoc);
});

router.put('/locations/:id', (req, res) => {
  const data = db.get();
  const loc = data.locations.find(l => l.id === req.params.id);
  if (!loc) {
    return res.status(404).json({ error: 'Location not found.' });
  }

  const { name, type, building, floor, roomNumber, departmentId, description } = req.body;
  if (name) loc.name = name.trim();
  if (type) loc.type = type;
  if (building) loc.building = building.trim();
  if (floor) loc.floor = floor.trim();
  if (roomNumber) loc.roomNumber = roomNumber.trim();
  if (departmentId !== undefined) loc.departmentId = departmentId;
  if (description !== undefined) loc.description = description.trim();

  db.scheduleSave();
  return res.json(loc);
});

router.delete('/locations/:id', (req, res) => {
  const data = db.get();
  const index = data.locations.findIndex(l => l.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Location not found.' });
  }
  data.locations.splice(index, 1);
  db.scheduleSave();
  return res.json({ success: true });
});

export default router;
