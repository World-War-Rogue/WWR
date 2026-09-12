# 02. BALLISTICS, TRAJECTORY EQUATIONS & PHYSICS ENGINE

**Folder Category:** Weapons Physics & Ballistic Combat Specifications  
**Security Level:** CLASSIFIED // LEVEL 3 CLEARANCE  
**Engine Implementation:** HTML5 2D Physics Canvas & Vector Mathematics  

---

## 1. Projectile Motion Model

All ballistic projectiles in World War Rogue (tank shells, artillery howitzers, mortar rounds, and anti-tank guided missiles) are calculated using discrete Newtonian physics equations:

$$\vec{r}(t) = \vec{r}_0 + \vec{v}_0 t + \frac{1}{2} \vec{g} t^2$$

Where:
- $\vec{r}_0$ is the muzzle exit position (vector in pixels/meters).
- $\vec{v}_0 = (v \cos \theta, v \sin \theta)$ is initial muzzle velocity vector determined by weapon caliber and propellant charge.
- $\vec{g} = (0, 9.81 \times \text{gravityScale})$ is the gravitational acceleration vector.
- $t$ is the elapsed flight time.

### Air Resistance & Drag
For artillery and mortars over long distance, a velocity decay factor is applied each tick:
$$\vec{v}_{t+1} = \vec{v}_t - (\frac{1}{2} \rho v^2 C_d A) \cdot \Delta t$$

---

## 2. Armor Sloping & Ricochet Calculation

When a kinetic projectile impacts an armored target, the actual penetration capability depends on the **impact angle relative to the plate normal**:

$$\text{Effective Armor Thickness} = \frac{\text{Nominal Thickness}}{\cos \theta_{\text{impact}}}$$

### Ricochet Trigger Conditions:
1. **Critical Angle Threshold:**
   If $\theta_{\text{impact}} \ge 68^\circ$ (sloped glasis plate), a ricochet check is mandatory.
2. **Deflection Probability:**
   $$P_{\text{ricochet}} = \min\left(0.95, \frac{\theta_{\text{impact}} - 65^\circ}{25^\circ} \times \frac{\text{Armor Hardness}}{\text{Projectile Kinetic Energy}}\right)$$
3. **Ricochet Outcome:**
   The shell deflects off the hull with altered velocity vector $\vec{v}' = \vec{v} - 2(\vec{v} \cdot \hat{n})\hat{n}$ and produces a distinct metallic ping sound effect (`soundFx.playRicochet()`).

---

## 3. Destructible Environment Grid

Battlefield obstacles are modeled with persistent hitpoints and structural integrity levels:

| Obstacle Type | Max HP | Kinetic Resistance | High Explosive Resistance | Destruction Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Sandbag Redoubt** | 250 | 40% Deflection | 10% (Vulnerable to HE) | Collapses into ground berm; reduces cover from 75% to 25%. |
| **Concrete Blast Wall** | 1,200 | 85% Deflection | 70% Resistance | Cracks at 50% HP; shatters into jagged rubble at 0 HP. |
| **Dragon's Teeth** | 2,500 | 95% (Immune to AP) | 80% Resistance | Obstructs tracked vehicle movement until cratered. |
| **Fuel Tanker Depot** | 400 | 10% Deflection | 5% (Highly Flammable) | Catastrophic secondary detonation; 300px AOE damage radius. |

When structures collapse, sightlines dynamically open up, allowing artillery observers and tank gunners to target rear echelon supply units.
