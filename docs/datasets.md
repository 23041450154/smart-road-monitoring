# Dataset Sources

This file is the attribution and licensing ledger for every dataset admitted to the pothole training corpus. A dataset must not be merged until its source, access terms, annotation format, and relevant classes are recorded here.

## RDD2022

Status: verified. The `China_MotorBike` subset was downloaded on 2026-09-05 from the public Figshare v1 archive and its nested ZIP passed `unzip -t`.

- Dataset name: RDD2022 — The multi-national Road Damage Dataset released through CRDDC 2022.
- Original project: [sekilab/RoadDamageDetector](https://github.com/sekilab/RoadDamageDetector#crowdsensing-based-road-damage-detection-challenge-crddc2022).
- Citable dataset: [Figshare DOI 10.6084/m9.figshare.21431547.v1](https://doi.org/10.6084/m9.figshare.21431547.v1).
- Dataset paper: [RDD2022: A multi-national image dataset for automatic Road Damage Detection](https://arxiv.org/abs/2209.08538).
- License recorded by the Figshare API: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Full published corpus: 47,420 road images from six countries according to the paper.
- Original annotations: Pascal VOC XML bounding boxes for train images; the official challenge test images have no public ground-truth annotations.
- Original challenge classes: D00 longitudinal crack, D10 transverse crack, D20 alligator crack, D40 pothole.
- Downloaded subset: `China_MotorBike`, containing 1,977 annotated train images and 500 unlabeled challenge-test images.
- Measured train annotations in the downloaded subset: 164 images with D40, 235 D40 boxes, and 1,813 images without D40.
- Downloaded nested ZIP size: 192,030,116 bytes.
- Downloaded nested ZIP SHA-256: `2acdc8b8527c9b36cce4ba97dfdd5be9090be32f588c31b769a08c1a41c0c274`.

The older country-specific S3 link currently returns HTTP 403. To avoid downloading the complete 13,264,172,619-byte archive, the stored `RDD2022/China_MotorBike.zip` member was retrieved from the official Figshare file with a standards-compliant HTTP Range request. No authentication or access control was bypassed.

Planned normalization:

- Original road-damage classes: D00, D10, D20, D40.
- Class retained: D40 only.
- Final mapping: D40 → YOLO class `0 pothole`.
- D00, D10, D20, and any other damage labels are discarded from the single-class training labels. Images containing no retained D40 boxes may be included only as traceable negative examples.
- The 500 official challenge-test images are not used for measured evaluation because their ground truth is unavailable.

## Public Roboflow datasets

Status: none selected or downloaded. RDD2022 is sufficient for pipeline verification, so no unverified Roboflow project was added.

Roboflow projects are considered individually. A project will be admitted only when its public source, downloadable annotations, license/terms, and semantic label quality can be verified. Ambiguous damage classes will not be mapped automatically.

## Palembang local road recordings

Status: not yet available.

- Source: manual smartphone/camera recordings collected with permission on Palembang roads.
- Location: `datasets/raw/palembang/videos/`.
- Derived frames: `datasets/raw/palembang/images/`.
- Annotation format: YOLO normalized bounding boxes.
- Final class: `0 pothole`.
- Attribution/ownership and collection-session metadata must be recorded before the data is included in a released dataset version.

No dataset counts or model metrics are reported until measured from files actually present on disk.
