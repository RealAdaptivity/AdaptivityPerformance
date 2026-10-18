import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS,
  isEuropeanVehicle,
  laborRateCentsForVehicle,
} from '../src/services/europeanRate.ts';

test('European labor is $175 an hour', () => {
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

test('everything else stays at the shop rate', () => {
  for (const v of [
    '2015 Ford Explorer Sport',
    '2003 Ford Thunderbird Bond · 3.9L V8',
    '2009 Honda Accord EX-L',
    '2015 Chrysler 200 C · 3.6L v6',
    '2012 Mack GU (Granite) GU713 10.8L 6-cyl Diesel',
    '2018 Toyota Sienna minivan',
    '2014 Nissan Maxima 3.5L 6-cyl',
    '',
    null,
  ]) {
    assert.ok(!isEuropeanVehicle(v), String(v));
  }
});

test('the rate follows the vehicle', () => {
  assert.equal(laborRateCentsForVehicle('2015 Audi SQ5', 15000), 17500);
  assert.equal(laborRateCentsForVehicle('2015 Ford F-150', 15000), 15000);
  assert.equal(laborRateCentsForVehicle('2015 Ford F-150', 16000), 16000, 'the shop default still applies to everything else');
});
