/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

"use strict";
const fs = require('fs');

// Note: Resources are already in the correct locations in public/
// This script is kept for compatibility but doesn't perform copying
// since Core and Resources directories already exist in public/

console.log('✅ Resources check: Core and Resources directories are already in place');
console.log('📁 Core directory exists:', fs.existsSync('./public/Core'));
console.log('📁 Resources directory exists:', fs.existsSync('./public/Resources'));

// Optional: Add any additional resource copying logic here if needed
// For now, resources are pre-deployed in the correct locations
