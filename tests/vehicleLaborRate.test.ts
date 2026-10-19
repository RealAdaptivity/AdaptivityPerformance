import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIESEL_LABOR_RATE_PER_HOUR_DOLLARS,
  EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS,
  isDieselVehicle,
  isEuropeanVehicle,
  laborRateCentsForVehicle,
  laborRateKindForVehicle,
  vehicleLaborRateLabel,
} from '../src/services/vehicleLaborRate.ts';

test('diesel labor is $200 an hour, European $175', () => {
  assert.equal(DIESEL_LABOR_RATE_PER_HOUR_DOLLARS, 200);
  assert.equal(EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS, 175);
});

test('European makes are recognized however the vehicle is written', () => {
  for (const v of [
    '2013 Bmw 535i M sport · 3.0 i6',
    '2015 Audi SQ5 Premium Plus · V6',
    '2025 Audi RS5 PREMIUM · 4.4',
    '2020 Volkswagen Tiguan S · 2.0L 4-cyl',
    '2018 VW Jetta',
    'MERCEDES-BENZ',
    '2016 Mercedes Benz C300',
    '2019 Land Rover Range Rover Sport',
    '2014 Range Rover Evoque',
    '2012 MINI Cooper S',
    '2021 Volvo XC90',
    '2017 Porsche Macan',
    '2016 Alfa Romeo Giulia',
  ]) {
    assert.ok(isEuropeanVehicle(v), v);
  }
});

test('diesels are recognized from the decoded engine, the engine family or the truck maker', () => {
  for (const v of [
    '2012 Mack GU (Granite) GU713 10.8L 6-cyl Diesel',
    '2019 Ford F-250 Super Duty Lariat · 6.7L V8 Diesel',
    '2018 F-250 Powerstroke',
    '2008 Ford F-350 Power Stroke',
    '2017 Chevrolet Silverado 2500HD Duramax',
    '2016 Ram 2500 Cummins',
    '2020 Ram 1500 EcoDiesel',
    '2014 Volkswagen Jetta TDI',
    '2019 Freightliner Cascadia',
    '2020 Peterbilt 579',
    '2018 Kenworth T680',
    '2015 International ProStar',
    '2021 Western Star 49X',
    '2019 Volvo VNL 760',
    '2017 Isuzu NPR',
    'Semi truck',
    'diesel 18‑wheeler',
    '18-wheeler',
  ]) {
    assert.ok(isDieselVehicle(v), v);
    assert.equal(laborRateKindForVehicle(v), 'diesel', v);
  }
});

test('gas vehicles are not diesels', () => {
  for (const v of [
    '2015 Ford Explorer Sport',
    '2003 Ford Thunderbird Bond · 3.9L V8',
    '2009 Honda Accord EX-L',
    '2015 Chrysler 200 C · 3.6L v6',
    '2018 Toyota Sienna minivan',
    '2021 Volvo XC90',
    '2019 Ford F-150 · 5.0L V8',
    '',
    null,
  ]) {
    assert.ok(!isDieselVehicle(v), String(v));
  }
});

test('the rate follows the vehicle, and a European diesel bills as a diesel', () => {
  assert.equal(laborRateCentsForVehicle('2015 Audi SQ5', 15000), 17500);
  assert.equal(laborRateCentsForVehicle('2016 Ram 2500 Cummins', 15000), 20000);
  assert.equal(laborRateCentsForVehicle('2019 Volvo VNL 760', 15000), 20000, 'a Volvo semi is a diesel');
  assert.equal(laborRateCentsForVehicle('2014 Volkswagen Jetta TDI', 15000), 20000);
  assert.equal(laborRateCentsForVehicle('2015 Ford F-150', 15000), 15000);
  assert.equal(laborRateCentsForVehicle('2015 Ford F-150', 16000), 16000, 'the shop default still applies to everything else');
  assert.equal(laborRateCentsForVehicle(null, 15000), 15000);
});

test('the hint names the rate, or nothing at the shop rate', () => {
  assert.equal(vehicleLaborRateLabel('2020 Peterbilt 579'), 'Diesel — $200/hr');
  assert.equal(vehicleLaborRateLabel('2017 Porsche Macan'), 'European vehicle — $175/hr');
  assert.equal(vehicleLaborRateLabel('2009 Honda Accord'), null);
});
